import { z } from 'zod';

export const shippingAddressFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Name cannot exceed 100 characters'),
  addressLine1: z.string().trim().min(1, 'Street address is required').max(255, 'Address line 1 cannot exceed 255 characters'),
  addressLine2: z.string().trim().max(255, 'Address line 2 cannot exceed 255 characters').optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required').max(100, 'City cannot exceed 100 characters'),
  state: z.string().trim().min(1, 'State or province is required').max(100, 'State cannot exceed 100 characters'),
  postalCode: z.string().trim().min(1, 'Postal / ZIP code is required').max(20, 'Postal code cannot exceed 20 characters'),
  country: z.string().trim().min(2, 'Country is required').max(100, 'Country cannot exceed 100 characters'),
  phone: z.string().trim().max(30, 'Phone cannot exceed 30 characters').optional().or(z.literal(''))
});

export type ShippingAddressFormData = z.infer<typeof shippingAddressFormSchema>;
