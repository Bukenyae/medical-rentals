import { EventQuoteInput, QuoteResult, StayQuoteInput } from '@/lib/bookings/types';
import { computeEventQuote, computeStayQuote } from '@/lib/bookings/quote-core.mjs';

export function getStayQuote(input: StayQuoteInput): QuoteResult {
  return computeStayQuote(input) as QuoteResult;
}

export function getEventQuote(input: EventQuoteInput): QuoteResult {
  return computeEventQuote(input) as QuoteResult;
}
