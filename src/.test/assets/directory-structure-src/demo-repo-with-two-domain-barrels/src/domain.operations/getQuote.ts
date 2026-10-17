import type { Quote } from '@src/domain';
import type { Quote as QuoteRelative } from '../domain';
import type { Widget } from 'some-pkg/domain';

export const getQuote = (input: { quote: Quote; peer: QuoteRelative; widget: Widget }) =>
  input.quote;
