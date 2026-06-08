/**
 * Content Body Validator
 * Trims and length-checks a user-provided content body.
 */

import { ValidationLimits } from '../limits/ValidationLimits';
import { ValidationError } from '../errors/AIErrors';

export function validateContentBody(content: string): string {
  if (typeof content !== 'string' || content.trim().length < ValidationLimits.CONTENT.MIN) {
    throw new ValidationError('Content cannot be empty');
  }
  const trimmed = content.trim();
  if (trimmed.length > ValidationLimits.CONTENT.MAX) {
    throw new ValidationError(`Content exceeds maximum length of ${ValidationLimits.CONTENT.MAX} characters`);
  }
  return trimmed;
}

/**
 * Truncate a content body to the SEO preview length, used before
 * sending it to the AI to keep the prompt within budget.
 */
export function truncateForSeoPreview(content: string): string {
  return content.substring(0, ValidationLimits.SEO_CONTENT_PREVIEW);
}

/**
 * Truncate a content body for the blog-image-prompt path.
 */
export function truncateForBlogPromptPreview(content: string): string {
  return content.substring(0, ValidationLimits.BLOG_PROMPT_PREVIEW);
}

/**
 * Truncate a content body for the A/B variant prompt path.
 */
export function truncateForAbVariantPreview(content: string): string {
  return content.substring(0, ValidationLimits.AB_VARIANT_CONTENT_PREVIEW);
}
