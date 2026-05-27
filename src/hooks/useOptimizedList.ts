// src/hooks/useOptimizedList.ts
import { useCallback } from 'react';

type ItemType = 'text' | 'voice' | 'image' | 'mixed';

export const useOptimizedList = () => {
  /**
   * Helper that estimates layout sizes based on the memory category type
   */
  const getEstimatedItemSize = useCallback((type: ItemType): number => {
    switch (type) {
      case 'voice':
        return 110;
      case 'image':
        return 220;
      case 'mixed':
        return 260;
      case 'text':
      default:
        return 95;
    }
  }, []);

  /**
   * Safe unique identifier list extraction helper
   */
  const keyExtractor = useCallback((item: any) => {
    return item.id ? item.id.toString() : Math.random().toString(36).substring(7);
  }, []);

  return {
    getEstimatedItemSize,
    keyExtractor,
  };
};
export default useOptimizedList;
