"use client";

import { useEffect } from "react";
import {
  type AppLocale,
  coerceLocale,
  resolveLocaleFromLanguages,
  translateText,
} from "@/lib/browser-i18n";

const textCache = new WeakMap<
  Text,
  {
    original: string;
    translated: string;
  }
>();

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
]);

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;

export function BrowserLanguageTranslator({
  initialLocale,
}: {
  initialLocale: AppLocale;
}) {
  useEffect(() => {
    let activeLocale =
      resolveStoredLocale() ??
      resolveLocaleFromLanguages(navigator.languages, initialLocale);

    document.documentElement.lang = activeLocale;
    translateTree(document.body, activeLocale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text, activeLocale);
          continue;
        }

        if (mutation.type === "attributes") {
          translateAttributes(mutation.target as Element, activeLocale);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, activeLocale);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateTree(node as Element, activeLocale);
          }
        });
      }
    });

    function handleLocaleChange(event: Event) {
      const locale = coerceLocale(
        (event as CustomEvent<{ locale?: string }>).detail?.locale,
      );
      if (!locale) return;

      activeLocale = locale;
      document.documentElement.lang = activeLocale;
      translateTree(document.body, activeLocale);
    }

    window.addEventListener("staking:locale-change", handleLocaleChange);

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("staking:locale-change", handleLocaleChange);
    };
  }, [initialLocale]);

  return null;
}

function resolveStoredLocale(): AppLocale | null {
  const fromQuery = coerceLocale(
    new URLSearchParams(window.location.search).get("locale") ??
      new URLSearchParams(window.location.search).get("lang"),
  );
  if (fromQuery) {
    try {
      window.localStorage.setItem("staking_locale", fromQuery);
    } catch {
      /* ignore */
    }
    return fromQuery;
  }

  try {
    return coerceLocale(window.localStorage.getItem("staking_locale"));
  } catch {
    return null;
  }
}

function translateTree(root: Element, locale: AppLocale) {
  if (shouldSkipElement(root)) return;

  translateAttributes(root, locale);

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return shouldSkipElement(node as Element)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      translateAttributes(node as Element, locale);
    } else if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node as Text, locale);
    }
    node = walker.nextNode();
  }
}

function shouldSkipElement(element: Element) {
  if (SKIP_TAGS.has(element.tagName)) return true;
  return Boolean(element.closest("[data-no-translate]"));
}

function translateTextNode(node: Text, locale: AppLocale) {
  const current = node.nodeValue ?? "";
  if (!current.trim()) return;

  const cached = textCache.get(node);
  const original = cached && current === cached.translated ? cached.original : current;
  const translated = translateText(original, locale);

  textCache.set(node, { original, translated });
  if (current !== translated) {
    node.nodeValue = translated;
  }
}

function translateAttributes(element: Element, locale: AppLocale) {
  TRANSLATABLE_ATTRIBUTES.forEach((attr) => {
    const current = element.getAttribute(attr);
    if (!current?.trim()) return;

    const originalKey = `data-i18n-original-${attr}`;
    const translatedKey = `data-i18n-translated-${attr}`;
    const previousOriginal = element.getAttribute(originalKey);
    const previousTranslated = element.getAttribute(translatedKey);
    const original =
      previousOriginal && current === previousTranslated ? previousOriginal : current;
    const translated = translateText(original, locale);

    element.setAttribute(originalKey, original);
    element.setAttribute(translatedKey, translated);
    if (current !== translated) {
      element.setAttribute(attr, translated);
    }
  });
}
