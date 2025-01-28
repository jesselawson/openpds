import { marked } from 'marked';
import DOMPurify from 'dompurify';

export class MarkdownService {
  static render(markdown: string): string {
    return DOMPurify.sanitize(marked(markdown));
  }
}

