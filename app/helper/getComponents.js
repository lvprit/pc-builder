import prisma from "../db.server";

export const fetchBuilderComponents = async(shopId, builderId) => {
    const components = await prisma.component.findMany({
          select: {
            id: true,
            name: true,
            order: true,
            isMultiSelct: true,
            shopifyProductIds: true,
            collectionTitle: true,
            shopifyCollectionId: true,
            createdAt: true,
          },
          where: {
            shopId: shopId,
            builderId
          },
          orderBy: [
            { order: "asc" },       // First sort by the 'order' field
            { createdAt: "desc" }   // Then by 'createdAt' for tie-breaks or nulls
          ]
        });
    
    return components
}