import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ProductApps, ProductChain, ProductHeadline } from '@/components/product/blocks';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // The shared product block (#2608): `content/docs/(start)/index*.mdx` renders the
    // same headline and six apps as the homepage, from `lib/product/`.
    ProductHeadline,
    ProductChain,
    ProductApps,
    ...components,
  };
}
