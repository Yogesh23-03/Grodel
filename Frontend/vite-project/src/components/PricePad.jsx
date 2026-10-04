import React from 'react'
import { useTranslation } from 'react-i18next'
import { FaMicrophone, FaDeleteLeft } from 'react-icons/fa6'

function PricePad({ price, onPriceChange, onSpeak, speakDisabled, readingPrice }) {
  const { t } = useTranslation()

  const append = (digit) => {
    onPriceChange(String(price || "").replace(/[^\d]/g, "") + digit)
  }

  const backspace = () => {
    onPriceChange(String(price || "").replace(/[^\d]/g, "").slice(0, -1))
  }

  const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

  return (
    <div className='bg-white shadow-lg rounded-2xl border border-gray-100 w-full'>
      <div className='w-full text-center text-2xl font-bold text-[#07111c] py-3 rounded-t-xl bg-[#fff9f6]'>
        ₹ {price ? price : 0}
      </div>
      <div className='grid grid-cols-3 gap-2 p-3'>
        {buttons.map((digit) => (
          <button
            key={digit}
            type='button'
            onClick={() => append(digit)}
            className='py-3 rounded-xl bg-[#07111c]/5 hover:bg-[#ff4d2d]/10 text-[#07111c] text-lg font-bold'
          >
            {digit}
          </button>
        ))}
        <button
          type='button'
          onClick={onSpeak}
          disabled={speakDisabled}
          className='py-3 rounded-xl bg-[#ff4d2d]/10 hover:bg-[#ff4d2d]/20 text-[#ff4d2d] text-lg flex items-center justify-center gap-1'
        >
          <FaMicrophone />
          {readingPrice ? <span className='text-xs font-semibold'>{t('vendor.listening')}</span> : null}
        </button>
        <button
          type='button'
          onClick={() => append("0")}
          className='py-3 rounded-xl bg-[#07111c]/5 hover:bg-[#ff4d2d]/10 text-[#07111c] text-lg font-bold'
        >
          0
        </button>
        <button
          type='button'
          onClick={backspace}
          className='py-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 text-lg'
          aria-label={t('common.cancel')}
        >
          <FaDeleteLeft />
        </button>
      </div>
    </div>
  )
}

export default PricePad