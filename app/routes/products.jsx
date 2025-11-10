
// import { json } from '@remix-run/node';
// // import { authenticate } from '~/shopify.server'; // Adjust path as needed
// import { authenticate } from '../shopify.server';

// export const loader = async ({ request }) => {
//   try {
//     console.log('here in loader...');

//     // Authenticate admin session
//     // const { admin } = await authenticate.admin(request);
//     const { admin } = await authenticate.public.appProxy(request);
//     console.log(admin, 'admin here..');

//     // GraphQL query to fetch first 5 products
//     const query = `
//       {
//         products(first: 5) {
//           edges {
//             node {
//               id
//               title
//               handle
//               featuredImage {
//                 url
//               }
//               variants(first: 3) {
//                 edges {
//                   node {
//                     id
//                     title
//                     price
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     `;

//     const response = await admin.graphql(query);
//     const data = await response.json();

//     return json(data);
//   } catch (error) {
//     console.error('Failed to fetch products:', error);
//     return json(
//       { error: 'Failed to fetch products', details: String(error) },
//       { status: 400 }
//     );
//   }
// };


import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // adjust if your path differs
import prisma from "../db.server";

export const loader = async ({ request }) => {
  try {

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") || null;
    const compId = url.searchParams.get("comp_id") || null;    

    // ✅ Authenticate the admin or app proxy session
    const { admin } = await authenticate.public.appProxy(request);
    // If this is a private admin route, use:
    // const { admin } = await authenticate.admin(request);
    if(!compId){
      return json({error:'Component id is not provided'}, {status:400})
    }

    const compnentId = parseInt(compId, 10);

    const componentData = await prisma.component.findFirst({
      select: {
        // isMultiSelct: true,
        shopifyProductIds: true,
        shopifyCollectionId: true,
      },
      where: {
        id: compnentId
      }
    })

    // 🧠 Your configuration (these could come from DB or settings)
    const shopifyProductIds = componentData.shopifyProductIds ? JSON.parse(componentData.shopifyProductIds) : [];

    const manualProductIds = shopifyProductIds.length ? shopifyProductIds.map(itm => `gid://shopify/Product/${itm}`) : [];

    const collectionId = componentData.shopifyCollectionId ? `gid://shopify/Collection/${componentData.shopifyCollectionId}` : null;
    const limit = 10;

    // 🟢 Step 1: Fetch manually selected products (only on first page)
    let manualProducts = [];
    if (!cursor && manualProductIds.length) {
      const manualQuery = `
        query getManualProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              handle
              featuredImage { url }
              publishedAt
              variants(first:10) {
                  edges {
                    node {
                      id
                      title
                      price
                      inventoryQuantity
                      availableForSale
                    }
                  }
                }
            }
          }
        }
      `;
      const manualRes = await admin.graphql(manualQuery, { variables: { ids: manualProductIds } });
      const manualData = await manualRes.json();
      manualProducts = (manualData.data?.nodes || []).filter(Boolean);
      // console.log(manualProducts, 'manual products here...');

    }

    if (!collectionId) {
      console.log('⚠️ No collectionId found — returning manual products only.');
      return json({
        products: manualProducts,
        nextCursor: null,
        hasNextPage: false,
      });
    }

    // 🟣 Step 2: Fetch collection products (paginated)
    const collectionQuery = `
      query getCollectionProducts($id: ID!, $limit: Int!, $cursor: String) {
        collection(id: $id) {
          id
          products(first: $limit, after: $cursor) {
            edges {
              cursor
              node {
                id
                title
                handle
                featuredImage { url }
                publishedAt
                variants(first:10) {
                  edges {
                    node {
                      id
                      title
                      price
                      inventoryQuantity
                      availableForSale
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      }
    `;

    const collectionRes = await admin.graphql(collectionQuery, {
      variables: { id: collectionId, limit, cursor },
    });
    const collectionData = await collectionRes.json();

    const edges = collectionData.data?.collection?.products?.edges || [];
    const collectionProducts = edges.map((e) => e.node);
    const nextCursor = edges.length ? edges[edges.length - 1].cursor : null;
    const hasNextPage = collectionData.data?.collection?.products?.pageInfo?.hasNextPage || false;

    // 🧩 Step 3: Merge + deduplicate
    const combined = [
      ...manualProducts,
      ...collectionProducts.filter((p) => !manualProducts.find((mp) => mp.id === p.id)),
    ];

    // ✅ Step 4: Return JSON
    return json({
      products: combined,
      nextCursor,
      hasNextPage,
    });
  } catch (error) {
    console.error("❌ Failed to fetch products:", error);
    return json(
      { error: "Failed to fetch products", details: String(error) },
      { status: 500 }
    );
  }
};
