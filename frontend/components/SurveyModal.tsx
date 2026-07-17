import React, { useState } from 'react';
import { Modal, message } from 'antd';
import Image from 'next/image';

interface SurveyModalProps {
  open: boolean;
  pelayananId: string;
  layananName: string;
  onSuccess: () => void;
}

const RatingOptions = ({ label, value, onChange, disabled }: { label: string, value: number | null, onChange: (val: number) => void, disabled: boolean }) => {
  return (
    <div className="mb-6">
      <p className="font-semibold text-slate-800 mb-3 text-left">{label}</p>
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onChange(1)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${value === 1
              ? 'border-[#DA251C] bg-red-50'
              : 'border-slate-200 hover:border-[#DA251C]/50 hover:bg-slate-50'
            }`}
        >
          <span className="text-4xl mb-2">😞</span>
          <span className={`text-sm font-semibold ${value === 1 ? 'text-[#DA251C]' : 'text-slate-500'}`}>Kurang</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(2)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${value === 2
              ? 'border-amber-500 bg-amber-50'
              : 'border-slate-200 hover:border-amber-500/50 hover:bg-slate-50'
            }`}
        >
          <span className="text-4xl mb-2">😐</span>
          <span className={`text-sm font-semibold ${value === 2 ? 'text-amber-600' : 'text-slate-500'}`}>Cukup</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(3)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${value === 3
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 hover:border-emerald-500/50 hover:bg-slate-50'
            }`}
        >
          <span className="text-4xl mb-2">😄</span>
          <span className={`text-sm font-semibold ${value === 3 ? 'text-emerald-600' : 'text-slate-500'}`}>Baik</span>
        </button>
      </div>
    </div>
  );
};

export default function SurveyModal({ open, pelayananId, layananName, onSuccess }: SurveyModalProps) {
  const [kebersihan, setKebersihan] = useState<number | null>(null);
  const [keramahan, setKeramahan] = useState<number | null>(null);
  const [solusi, setSolusi] = useState<number | null>(null);
  const [informasi, setInformasi] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleCloseSuccess = () => {
    if (isSuccess) {
      onSuccess();
      setTimeout(() => {
        setIsSuccess(false);
        setKebersihan(null);
        setKeramahan(null);
        setSolusi(null);
        setInformasi(null);
      }, 300);
    }
  };

  const handleSubmit = async () => {
    if (!kebersihan || !keramahan || !solusi || !informasi) {
      messageApi.error('Mohon isi semua penilaian sebelum mengirim');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/penilaian', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pelayananId,
          layananName,
          kebersihan,
          keramahan,
          solusi,
          informasi
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
      } else {
        messageApi.error(data.error || 'Gagal mengirim penilaian');
      }
    } catch (error) {
      messageApi.error('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormComplete = kebersihan && keramahan && solusi && informasi;

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={handleCloseSuccess}
        closable={false}
        mask={{ closable: isSuccess }}
        keyboard={isSuccess}
        footer={null}
        centered
        width={600}
        styles={{
          mask: {
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
          },
          body: {
            padding: 0,
          }
        }}
      >
        <div className="h-full max-h-[85vh] overflow-y-auto flex flex-col">
          {isSuccess ? (
            <div 
              onClick={handleCloseSuccess}
              className="flex flex-col items-center justify-center p-12 text-center min-h-[400px] cursor-pointer"
            >
              <span className="text-8xl mb-6">😊</span>
              <h2 className="text-4xl font-bold text-blue-900 mb-4 tracking-tight">Terima Kasih</h2>
              <p className="text-lg text-slate-600 font-medium">Penilaian Anda telah berhasil dikirim.</p>
              <p className="text-sm text-slate-400 mt-8 animate-pulse">Klik di mana saja untuk menutup</p>
            </div>
          ) : (
            <>
              {/* Header Section */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-center gap-4 bg-slate-50/50">
            <div className="flex-shrink-0">
              <Image
                src="/assets/images/ojk-banten-logo.png"
                alt="Logo OJK"
                width={100}
                height={40}
                className="h-10 w-auto object-contain"
              />
              <Image
                src="/assets/images/logo-ojk-putih.png"
                alt="Logo OJK"
                width={100}
                height={40}
                className="h-10 w-auto object-contain hidden"
              />
            </div>
            <div className="flex-1 text-center">
              <h2 className="text-xl font-bold text-blue-900 leading-tight">Survei Kepuasan Pelayanan</h2>
              <p className="text-sm font-medium text-slate-500">OJK Provinsi Banten</p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 flex-1">

            <RatingOptions label="1. Kebersihan Ruangan Loket" value={kebersihan} onChange={setKebersihan} disabled={isLoading} />
            <RatingOptions label="2. Keramahan Petugas" value={keramahan} onChange={setKeramahan} disabled={isLoading} />
            <RatingOptions label="3. Solusi yang Disampaikan Pelayanan" value={solusi} onChange={setSolusi} disabled={isLoading} />
            <RatingOptions label="4. Informasi yang Disampaikan Pelayanan" value={informasi} onChange={setInformasi} disabled={isLoading} />

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button
                onClick={handleSubmit}
                disabled={!isFormComplete || isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mengirim...
                  </>
                ) : (
                  'Kirim Penilaian'
                )}
              </button>
            </div>
          </div>
          </>
          )}
        </div>
      </Modal>
    </>
  );
}
