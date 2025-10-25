import { BlockStack, Box, Button, Card, InlineStack, Page, Text } from '@shopify/polaris'
import { ArrowRightIcon } from '@shopify/polaris-icons'
import React from 'react'

function TopBar() {
    return (
        <Page>
            {/* <Card background="bg-surface-secondary"> */}
                <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                        <InlineStack blockAlign="center" gap="200">
                            <Text variant="headingLg" as="h2" fontWeight="bold">
                                Store name
                            </Text>
                        </InlineStack>
                        <Button icon={ArrowRightIcon} variant="primary">Documentation</Button>
                    </InlineStack>
                </BlockStack>
            {/* </Card> */}
        </Page>
    )
}

export default TopBar
