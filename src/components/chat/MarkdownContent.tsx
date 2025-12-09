/**
 * MarkdownContent.tsx
 * 
 * Komponent renderujący treść Markdown z sanitizacją.
 * Używa prostego renderowania (bez biblioteki react-markdown dla MVP).
 * 
 * TODO: W przyszłości można dodać react-markdown + rehype-sanitize
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Prosta funkcja do konwersji Markdown do HTML
 * Dla MVP - podstawowe formatowanie (bold, italic, links, lists)
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');

  // Unordered lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');

  // Paragraphs
  html = html.split('\n\n').map((p) => {
    if (p.trim() && !p.match(/^<[h|u|o]|^<li/)) {
      return `<p>${p.trim()}</p>`;
    }
    return p;
  }).join('\n');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div
      className={cn('prose prose-sm max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

