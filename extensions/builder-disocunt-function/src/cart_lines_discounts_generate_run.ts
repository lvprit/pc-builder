import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from '../generated/api';

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  // 1️⃣ Exit early if no cart lines
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  // 2️⃣ Only order discounts
  if (!input.discount.discountClasses.includes(DiscountClass.Order)) {
    return { operations: [] };
  }

  // 3️⃣ Filter builder-only items
  const builderItems = input.cart.lines.filter(
    (line) => line.builderBundleId?.value === 'unique-pc-builder-id',
  );

  if (!builderItems.length) {
    return { operations: [] };
  }

  // 4️⃣ Parse active discount rules from shop metafield
  if (!input.shop.metafield?.value) {
    return { operations: [] };
  }

  let discountRules: any[] = [];
  try {
    discountRules = JSON.parse(input.shop.metafield.value);
  } catch {
    return { operations: [] };
  }

  const nonBuilderLineIds = input.cart.lines
  .filter((line) => line.builderBundleId?.value !== 'unique-pc-builder-id')
  .map((line) => line.id);


  const activeOrderRules = discountRules.filter(
    (rule) => rule.status === 'active' && rule.type === 'order',
  );

  if (!activeOrderRules.length) {
    return { operations: [] };
  }

  // 5️⃣ Map each rule to a candidate
  const candidates = activeOrderRules.map((rule) => {
    const conditions: any[] = [];

    // Spend threshold condition (applies to whole order subtotal)
    if (rule.rule_type === 'spend_threshold' && rule.condition?.subtotal_gte) {
      conditions.push({
        orderMinimumSubtotal: {
          minimumAmount: rule.condition.subtotal_gte,
          excludedCartLineIds: nonBuilderLineIds,
        },
      });
    }

    // Item count condition (only builder items)
    if (rule.rule_type === 'item_count' && rule.condition?.item_count_gte) {
      conditions.push({
        cartLineMinimumQuantity: {
          minimumQuantity: rule.condition.item_count_gte,
          ids: builderItems.map((line) => line.id),
        },
      });
    }

    // Determine discount value
    const value: any = {};
    if (rule.action?.discount_type === 'percentage') {
      value.percentage = { value: rule.action.value };
    } else if (rule.action?.discount_type === 'fixed') {
      value.fixedAmount = {
        amount: rule.action.value,
      };
    }

    const candidate: any = {
      message: rule.name,
      targets: [
        {
          orderSubtotal: {
            excludedCartLineIds: nonBuilderLineIds,
          },
        },
      ],
      value,
    };

    if (conditions.length > 0) {
      candidate.conditions = conditions;
    }

    return candidate;
  });

  // 6️⃣ Return operations
  return {
    operations: [
      {
        orderDiscountsAdd: {
          selectionStrategy: OrderDiscountSelectionStrategy.Maximum,
          candidates,
        },
      },
    ],
  };
}