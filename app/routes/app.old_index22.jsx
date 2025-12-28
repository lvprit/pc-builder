import { redirect, useFetcher, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  console.log('log in app index2');
  
  // return redirect("builders");
  return null;
};


export default function Index() {
  // const fetcher = useFetcher();
  // const shopify = useAppBridge();
  // const navigate = useNavigate();

  // const isLoading =
  //   ["loading", "submitting"].includes(fetcher.state) &&
  //   fetcher.formMethod === "POST";
  // const productId = fetcher.data?.product?.id.replace(
  //   "gid://shopify/Product/",
  //   "",
  // );

  // useEffect(() => {
  //   if (productId) {
  //     shopify.toast.show("Product created");
  //   }
  // }, [productId, shopify]);
  // const generateProduct = () => fetcher.submit({}, { method: "POST" });

  return <h3>hi loveprewwet</h3>;
    // <Page>
    //   <TitleBar title="Remix app template">
    //     <button variant="primary" onClick={generateProduct}>
    //       Generate a product
    //     </button>
    //   </TitleBar>
    //   <BlockStack gap="500">

    //     <Card>
    //       <BlockStack gap="200">
    //         <Text as="h2" variant="headingMd">
    //           Quick Actions
    //         </Text>
    //         <Text as="p" tone="subdued">
    //           Start your workflow by creating builders and adding components
    //         </Text>

    //         <InlineStack gap="400" wrap>
    //           <Button
    //             variant="primary"
    //             onClick={() => navigate('builders')}
    //           >
    //             <BlockStack align="center" gap="200">
    //               <PlusIcon height={40}/>
    //               <span>Create Builder</span>
    //             </BlockStack>
    //           </Button>

    //           <Button variant="secondary">
    //             <BlockStack align="center" gap="200">
    //               <PackageIcon height={40}/>
    //               <span>View Components</span>
    //             </BlockStack>
    //           </Button>

    //           <Button variant="secondary">
    //             <BlockStack align="center" gap="200">
    //               <ChartVerticalFilledIcon height={40}/>
    //               <span>View Analytics</span>
    //             </BlockStack>
    //           </Button>
    //         </InlineStack>
    //       </BlockStack>
    //     </Card>

    //   </BlockStack>
    // </Page>
}
