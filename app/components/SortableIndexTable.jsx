import { useCallback, useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IndexTable, Box, Text, Badge, Button, InlineStack, Checkbox } from '@shopify/polaris';
import { CollectionIcon, DeleteIcon, DragHandleIcon, EditIcon, ProductIcon } from '@shopify/polaris-icons'

// A sortable row component that uses `useSortable`
const SortableRow = ({
    builder,
    index,
    handleProductSelection,
    handleCollectionSelection,
    editCompnenthanlder,
    showDeleteModalHander,
    handleMiltiSelectChange,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: builder.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: "grab",
        opacity: isDragging ? 0.5 : 1,
    };

    // ✅ Wrap IndexTable.Row in a div that gets the ref
    return (
        <IndexTable.Row id={builder.id} key={builder.id} position={index}>
            <IndexTable.Cell>
                {/* <Text as="span" variant="bodyMd" fontWeight="bold">
            {builder.name}
          </Text> */}
                <InlineStack align='space-between'>
                    <div style={style} ref={setNodeRef} {...attributes} {...listeners}> {/* Apply style and listeners here */}
                        <InlineStack gap={200} wrap={false}>
                            <DragHandleIcon height={20} />
                            <Text as="span" variant="bodyMd" fontWeight="bold">
                                {builder.name}
                            </Text>
                        </InlineStack>
                    </div>
                    <EditIcon cursor={'pointer'} height={20} onClick={(e) => {
                        e.stopPropagation();
                        editCompnenthanlder(builder.id, builder.name);
                    }} />
                </InlineStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
                <Checkbox
                    checked={builder.isMultiSelct}
                    onChange={(e) => {
                        handleMiltiSelectChange(builder.id, e)
                    }}
                />
            </IndexTable.Cell>
            <IndexTable.Cell>{new Date(builder.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })}
            </IndexTable.Cell>
            <IndexTable.Cell>
                <InlineStack gap={150} wrap={false}>
                    <Button onClick={(e) => {
                        e.stopPropagation();
                        handleProductSelection(builder.id);
                    }}
                        icon={ProductIcon}
                    >
                        Manual Product Selection
                    </Button>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {builder.collectionTitle ? (
                            <div onClick={() => handleCollectionSelection(builder.id)} style={{ cursor: 'pointer' }}>
                                <Button
                                    icon={CollectionIcon}
                                    disabled
                                >
                                    {builder.collectionTitle}
                                </Button>
                                <EditIcon height={20} />
                            </div>
                        ) : (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCollectionSelection(builder.id);
                                }}
                                icon={CollectionIcon}
                            >
                                Add from Collection
                            </Button>
                        )}
                    </div>
                    {/* <Button onClick={() => { }} icon={EditIcon} /> */}
                    <Button destructive icon={DeleteIcon} onClick={() => showDeleteModalHander(builder.id, builder.name)} />
                </InlineStack>
            </IndexTable.Cell>
        </IndexTable.Row>
    );
};

// The main component that wraps the IndexTable with DndContext
export default function SortableIndexTable({
    components,
    setCompnents,
    onOrderChange,
    editCompnenthanlder,
    showToast,
    showDeleteModalHander
}) {
    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    // const [selectedCollName, setSelectedCollName] = useState('');
    const [secletMultiple, setSelectMultiple] = useState(false);


    const handleProductSelection = async (compId) => {

        const selectedComp = components?.find(itm => itm.id === compId);

        const selectedParsedPrds = selectedComp.shopifyProductIds ? JSON.parse(selectedComp.shopifyProductIds) : [];
        const selectedPrds = selectedParsedPrds.length > 0 && selectedParsedPrds.map((itm) => {
            return { id: `gid://shopify/Product/${itm}` }
        })

        const selectedItems = await shopify.resourcePicker({
            // selectionIds: selectedProducts?.map((prd=>prd.id)),
            selectionIds: selectedPrds,
            type: "product",
            action: "select",
            showVariant: true,
            multiple: true
        })
        if (selectedItems) {
            const productIds = selectedItems.map(itm => itm.id.split('/').pop());

            try {
                const response = await fetch(`/server/edit-components/${compId}?_data`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json", // Specify JSON content type
                    },
                    body: JSON.stringify({ shopifyProductIds: JSON.stringify(productIds) }), // Stringify the JavaScript object
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(result.message)
                    // Optionally handle success, redirect, or clear form

                    setCompnents((prev => {
                        const compIndex = prev.findIndex(itm => itm.id === compId);
                        if (compIndex !== -1) {
                            return prev?.map((comp, i) => {
                                return compIndex === i ? { ...comp, shopifyProductIds: JSON.stringify(productIds) } : comp
                            })
                        }

                    }))
                } else {
                    showToast(result.error || "Something went wrong!")
                }

            } catch (error) {
                showToast(error?.message || "Something went wrong!")
            }
        }
    };

    const handleCollectionSelection = async (compId) => {

        const selectedComp = components?.find(itm => itm.id === compId);

        const selectedColId = selectedComp.shopifyCollectionId;
        const collGID = selectedColId ? `gid://shopify/Collection/${selectedColId}` : ''

        const selectCollection = await shopify.resourcePicker({
            selectionIds: collGID ? [{ id: collGID }] : [],
            type: "collection",
            action: "select",
            showVariant: true,
        })
        if (selectCollection) {
            const collection = selectCollection.map(items => ({
                id: items.id,
                title: items.title,
                // handle: items.handle
            }))

            const collectionId = collection[0].id.split('/').pop();

            try {
                const response = await fetch(`/server/edit-components/${compId}?_data`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json", // Specify JSON content type
                    },
                    body: JSON.stringify({ shopifyCollectionId: collectionId, collectionTitle: collection[0].title }), // Stringify the JavaScript object
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(result.message)

                    // setSelectedCollName(collection[0].title);
                    // Optionally handle success, redirect, or clear form
                    setCompnents((prev => {
                        const compIndex = prev.findIndex(itm => itm.id === compId);
                        if (compIndex !== -1) {
                            return prev?.map((comp, i) => {
                                return compIndex === i ? { ...comp, shopifyCollectionId: collectionId, collectionTitle: collection[0].title } : comp
                            })
                        }
                    }))
                } else {
                    showToast(result.error || "Something went wrong!")
                }

            } catch (error) {
                showToast(error?.message || "Something went wrong!")
            }
        }
    };

    function handleDragStart(event) {
        setActiveId(event.active.id);
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = components.findIndex(builder => builder.id === active.id);
            const newIndex = components.findIndex(builder => builder.id === over.id);
            const newOrder = arrayMove(components, oldIndex, newIndex);
            onOrderChange(newOrder);
        }
        setActiveId(null);
    }

    function handleDragCancel() {
        setActiveId(null);
    }

    const ids = components.map((builder) => builder.id);
    const activeBuilder = activeId ? components.find(builder => builder.id === activeId) : null;

    const headings = [
        { title: "Component Name" },
        { title: "Multi-Select" },
        { title: "Created" },
        { title: "Actions" },
    ];

    const handleMiltiSelectChange = async (compId, newChecked) => {
        console.log('handleMltiSele called');

        try {
            // setSelectMultiple(newChecked);

            const response = await fetch(`/server/edit-components/${compId}?_data`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // Specify JSON content type
                },
                body: JSON.stringify({ isMultiSelct: newChecked }), // Stringify the JavaScript object
            });

            const result = await response.json();

            if (response.ok) {
                showToast(result.message)
                setCompnents((prev => {
                    const compIndex = prev.findIndex(itm => itm.id === compId);
                    if (compIndex !== -1) {
                        return prev?.map((comp, i) => {
                            return compIndex === i ? { ...comp, isMultiSelct: newChecked } : comp
                        })
                    }
                }))
        } else {
            showToast(result.error || "Something went wrong!")
        }

    } catch (error) {
        console.log(error);
    }
}

return (
    <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
    >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <IndexTable
                resourceName={{ singular: "component", plural: "components" }}
                itemCount={components.length}
                selectable={false}
                headings={headings}
            >
                {components.map((builder, index) => (
                    <SortableRow
                        key={builder.id}
                        builder={builder}
                        index={index}
                        handleProductSelection={handleProductSelection}
                        handleCollectionSelection={handleCollectionSelection}
                        editCompnenthanlder={editCompnenthanlder}
                        showDeleteModalHander={showDeleteModalHander}
                        handleMiltiSelectChange={handleMiltiSelectChange}
                    />
                ))}
            </IndexTable>
        </SortableContext>

        <DragOverlay>
            {activeBuilder ? (
                <Box
                    background="bg-surface"
                    border="base"
                    borderRadius="200"
                    padding="200"
                    shadow="base"
                >
                    <Text as="span" variant="bodyMd" fontWeight="bold">
                        {activeBuilder.name}
                    </Text>
                </Box>
            ) : null}
        </DragOverlay>

    </DndContext>
);
}