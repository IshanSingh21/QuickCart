import { ShippingAddress } from '../../../types';

const SAVED_ADDRESS_STORAGE_KEY = 'quickcart_saved_address';

export function loadSavedShippingAddress(): ShippingAddress | null {
  try {
    const raw = localStorage.getItem(SAVED_ADDRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.fullName && parsed.addressLine1) {
      return parsed as ShippingAddress;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveShippingAddress(address: ShippingAddress): void {
  try {
    localStorage.setItem(SAVED_ADDRESS_STORAGE_KEY, JSON.stringify(address));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearSavedShippingAddress(): void {
  try {
    localStorage.removeItem(SAVED_ADDRESS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
