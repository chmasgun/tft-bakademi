import { useState, useEffect, useCallback } from 'react';
import { fetchTFTData, getLatestSetData } from '../api/communityDragon';
import type { TFTSetData, CDragonTFTData } from '../types/tft';

interface UseTFTDataReturn {
  data: TFTSetData | null;
  rawData: CDragonTFTData | null;
  loading: boolean;
  error: Error | null;
}

export const useTFTData = (): UseTFTDataReturn => {
  const [data, setData] = useState<TFTSetData | null>(null);
  const [rawData, setRawData] = useState<CDragonTFTData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch TFT data from Community Dragon
      // This includes champions, traits, items AND augments (from setData.augments)
      const tftData = await fetchTFTData();
      setRawData(tftData);

      const latestSet = getLatestSetData(tftData);
      setData(latestSet);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch TFT data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    rawData,
    loading,
    error,
  };
};

export default useTFTData;
