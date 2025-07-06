
import * as z from 'zod';
import type { UserProfileFirestoreData } from '@/schemas/userProfileSchema';

export const PersonalInfoFormSchema = z.object({
  displayName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
});

export const CompanyInfoFormSchema = z.object({
  companyName: z.string().max(100).optional().or(z.literal('')),
  companyCnpj: z.string().max(20).optional().or(z.literal('')),
  businessType: z.string().max(100).optional().or(z.literal('')),
  companyPhone: z.string().max(20).optional().or(z.literal('')),
  companyEmail: z.string().email('Email da empresa inválido.').max(100).optional().or(z.literal('')),
  personalPhoneNumber: z.string().max(20).optional().or(z.literal('')),
});

export const defaultCompanyValues: UserProfileFirestoreData = {
  companyName: '',
  companyCnpj: '',
  businessType: '',
  companyPhone: '',
  companyEmail: '',
  personalPhoneNumber: '',
};
