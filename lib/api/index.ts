// Public surface for catalog / blog data.
// Pages and components import from here only — never from ./live or ./mock
// directly. Mode dispatch lets us flip mock <-> live with one env var.

import { IS_LIVE } from "./mode";

import * as mockSite from "./mock/site";
import * as mockProductsImpl from "./mock/products";
import * as mockCategoriesImpl from "./mock/categories";
import * as mockBlogImpl from "./mock/blog";
import * as mockBundlesImpl from "./mock/bundles";
import * as mockCollectionsImpl from "./mock/collections";
import * as mockPagesImpl from "./mock/pages";

import * as liveSite from "./live/site";
import * as liveProductsImpl from "./live/products";
import * as liveCategoriesImpl from "./live/categories";
import * as liveBlogImpl from "./live/blog";
import * as liveBundlesImpl from "./live/bundles";
import * as liveCollectionsImpl from "./live/collections";
import * as livePagesImpl from "./live/pages";

const site = IS_LIVE ? liveSite : mockSite;
const products = IS_LIVE ? liveProductsImpl : mockProductsImpl;
const categories = IS_LIVE ? liveCategoriesImpl : mockCategoriesImpl;
const blog = IS_LIVE ? liveBlogImpl : mockBlogImpl;
const bundles = IS_LIVE ? liveBundlesImpl : mockBundlesImpl;
const collections = IS_LIVE ? liveCollectionsImpl : mockCollectionsImpl;
const pages = IS_LIVE ? livePagesImpl : mockPagesImpl;

export const getSite = site.getSite;
export const listProducts = products.listProducts;
export const getProduct = products.getProduct;
export const getProductReviews = products.getProductReviews;
export const getFrequentlyBoughtWith = products.getFrequentlyBoughtWith;
export const listOffers = products.listOffers;
export const listCategories = categories.listCategories;
export const listBlogPosts = blog.listBlogPosts;
export const listFeaturedPosts = blog.listFeaturedPosts;
export const listBlogCategories = blog.listBlogCategories;
export const getBlogPost = blog.getBlogPost;
export const listBundles = bundles.listBundles;
export const getBundle = bundles.getBundle;
export const getCollection = collections.getCollection;
export const listPages = pages.listPages;
export const getPage = pages.getPage;

export { API_MODE, IS_LIVE, IS_MOCK } from "./mode";
export { ApiError } from "./client";
export type * from "./types";
