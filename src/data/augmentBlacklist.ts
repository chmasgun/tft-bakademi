/**
 * Augment Blacklist
 * 
 * Add augment apiNames here to exclude them from the app.
 * You can find the apiName in the console when you click an augment,
 * or in data/set16-active-augments.json
 * 
 * Example: 'TFT_Augment_SomeAugment'
 */

export const augmentBlacklist: string[] = [
  // Add augment apiNames to blacklist here
  // Example:
  // 'TFT_Augment_ExampleAugment',
  // 'TFT10_Augment_CrashTestDummies',
];

/**
 * Check if an augment should be excluded
 */
export const isAugmentBlacklisted = (apiName: string): boolean => {
  return augmentBlacklist.includes(apiName);
};

export default augmentBlacklist;
