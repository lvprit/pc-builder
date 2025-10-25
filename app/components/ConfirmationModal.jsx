import { Box, Modal, Text } from '@shopify/polaris'
import { useState } from 'react'

function ConfirmationModal({active, handleClose, loading, confirmDelete, builderDetail}) {

  return (
    <Box>
      {/* Polaris Modal for confirmation */}
      <Modal
        open={active}
        onClose={handleClose}
        title="Delete builder"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: () => confirmDelete(builderDetail.id),
          disabled: loading,
          loading
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleClose,
          },
        ]}
      >
        <Modal.Section>
          <Text as='p' variant="bodyMd">
              Are you sure you want to delete{" "}
              <b>{builderDetail.name}</b>? This action cannot be undone.
          </Text>
        </Modal.Section> 
      </Modal>
    </Box>
  )
}

export default ConfirmationModal
