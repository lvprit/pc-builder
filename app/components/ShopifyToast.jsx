import { Box, Frame, Toast } from '@shopify/polaris';

function ShopifyToast({toast, setToast}) {
    return (
        <Box visuallyHidden>
            <Frame>
                {/* Your form and other elements go here */}

                {toast.visible && (
                    <Toast content={toast.content} onDismiss={() => setToast({ ...toast, visible: false })} error={toast.isError} />
                )}
            </Frame>
        </Box>
    );
}

export default ShopifyToast
