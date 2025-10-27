import { useContext } from 'react';
import { RadixContext } from '../providers/radixProvider';

export const useRadix = () => {
  const context = useContext(RadixContext);
  return context;
};
