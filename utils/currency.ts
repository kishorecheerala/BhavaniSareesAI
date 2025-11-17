/**
 * Formats a number as Indian Rupees (INR) using the en-IN locale.
 * @param amount The number to format.
 * @returns A string representing the formatted currency, e.g., "₹1,23,456.78".
 */
export const formatINR = (amount: number): string => {
  // Ensure we are working with a valid number, default to 0 if not.
  const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(numericAmount);
};
