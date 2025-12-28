import { useLocation } from '@remix-run/react';
import { BlockStack, Box, Button, Card, Icon, InlineStack, Page, Text } from '@shopify/polaris'
import {
    ArrowRightIcon,
    AppsIcon,
    PackageIcon,
    ChartVerticalFilledIcon,
} from '@shopify/polaris-icons'

const stats = [
    // {
    //     title: "Active Builders",
    //     value: "8",
    //     change: "+2 from last month",
    //     icon: AppsIcon,
    //     color: "orangered",
    // },
    {
        title: "Total Components",
        value: "24",
        change: "+5 from last month",
        icon: PackageIcon,
        color: "teal",
    },
    {
        title: "Monthly Sales",
        value: "$24,580",
        change: "+8.2% from last month",
        icon: ChartVerticalFilledIcon,
        color: "green",
    },
];


function TopBar({builderId}) {

    return (
        <Box paddingBlockEnd={300}>
            <Card padding={200}>
                <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">

                        <InlineStack blockAlign="center" gap="200">
                            {stats.map((stat, index) => (
                                <Card background="bg-surface-secondary" key={index}>
                                    <Box padding="100" paddingBlockEnd="100">
                                        <InlineStack align="space-between" gap={300}>
                                            <Text variant="bodySm">{stat.title}</Text>
                                            <Icon
                                                source={stat.icon}
                                                tone="base"
                                                style={{ color: stat.color, width: 14, height: 14 }}
                                            />
                                        </InlineStack>

                                        <Box paddingBlockStart="200">
                                            <Text variant="headingLg">{stat.value}</Text>

                                            <Text tone="subdued" variant="bodyXs">
                                                {stat.change}
                                            </Text>
                                        </Box>
                                    </Box>
                                </Card>
                            ))}
                        </InlineStack>
                        <BlockStack gap="300" padding="300" align="start">
                            <Box padding="300" background="bg-surface-secondary" border="base" borderRadius="200">
                                <BlockStack gap="200">
                                    <Text variant="bodyLg" as="h3" fontWeight="bold">
                                        Manage Your PC Builder
                                    </Text>

                                    <Box maxWidth="320px">
                                        <Text variant="bodySm" as="p" tone="subdued">
                                            Configure components, rules, and discounts for your customers’ custom PC builds.
                                        </Text>
                                    </Box>

                                    <InlineStack gap="200">
                                        <Button icon={ArrowRightIcon} variant="primary">
                                            Documentation
                                        </Button>
                                        {
                                            builderId && (
                                                <Button icon={ArrowRightIcon} variant="secondary">Add Compatibility</Button>
                                            )
                                        }
                                    </InlineStack>
                                </BlockStack>
                            </Box>
                        </BlockStack>

                    </InlineStack>
                </BlockStack>
            </Card>
        </Box>
    )
}

export default TopBar
