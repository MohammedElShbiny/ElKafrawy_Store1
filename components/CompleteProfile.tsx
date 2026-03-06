import React, { useState } from 'react';
import { UserProfile, Language } from '../types';
import { dbUpdateUserProfile } from '../services/db';

interface CompleteProfileProps {
  currentUser: UserProfile;
  lang: Language;
  t: any;
  onComplete: () => void;
}

export const CompleteProfile: React.FC<CompleteProfileProps> = ({ currentUser, lang, t, onComplete }) => {
  const [formData, setFormData] = useState({
    accountType: 'individual' as 'individual' | 'company',
    name: currentUser.displayName || '',
    phone: '',
    address: '',
    goal: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) return;
    
    setIsSaving(true);
    try {
      const profileUpdate: Partial<UserProfile> = {
        displayName: formData.name,
        phoneNumber: formData.phone,
        address: formData.address,
        accountType: formData.accountType,
        isProfileComplete: true
      };

      if (formData.accountType === 'company') {
        profileUpdate.goal = formData.goal;
      }

      await dbUpdateUserProfile(currentUser.uid, profileUpdate);
      onComplete();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(lang === 'en' ? 'Error saving profile' : 'خطأ في حفظ الملف الشخصي');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-slideUp border border-slate-200 dark:border-slate-800 p-10">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          {lang === 'en' ? 'Complete Your Profile' : 'أكمل ملفك الشخصي'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">
          {lang === 'en' ? 'Please provide additional details to continue.' : 'يرجى تقديم تفاصيل إضافية للمتابعة.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                {lang === 'en' ? 'Account Type' : 'نوع الحساب'}
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'individual' })}
                  className={`flex-1 p-4 rounded-2xl font-black border-2 transition-all ${
                    formData.accountType === 'individual'
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {lang === 'en' ? 'Individual' : 'فرد'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, accountType: 'company' })}
                  className={`flex-1 p-4 rounded-2xl font-black border-2 transition-all ${
                    formData.accountType === 'company'
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {lang === 'en' ? 'Company' : 'شركة'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                {formData.accountType === 'company' 
                  ? (lang === 'en' ? 'Company Name' : 'اسم الشركة')
                  : (lang === 'en' ? 'Full Name' : 'الاسم الكامل')}
              </label>
              <input
                required
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:border-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                {formData.accountType === 'company'
                  ? (lang === 'en' ? 'Company Address' : 'عنوان الشركة')
                  : (lang === 'en' ? 'Address' : 'العنوان')}
              </label>
              <input
                required
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:border-blue-500"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {formData.accountType === 'company' && (
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  {lang === 'en' ? 'Company Goal' : 'هدف الشركة'}
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:border-blue-500"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                {lang === 'en' ? 'Phone Number' : 'رقم الهاتف'}
              </label>
              <input
                required
                type="tel"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold outline-none focus:border-blue-500"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
          >
            {isSaving ? (lang === 'en' ? 'Saving...' : 'جاري الحفظ...') : (lang === 'en' ? 'Save Profile' : 'حفظ الملف الشخصي')}
          </button>
        </form>
      </div>
    </div>
  );
};
