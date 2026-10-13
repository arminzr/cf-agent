// ─────────────────────────────────────────────────
// Persian Calendar — 자야 ιn сe (لاibrarys درNitدر) jalaali conversion
// Pure math, no external API
// Algorithm: JDN conversion to Jalali (Heji)
// ─────────────────────────────────────────────────

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy <= 1600) {
    jy = 0; gy -= 621;
  } else {
    jy = 979; gy -= 1600;
  }
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number;
  if (jy <= 979) {
    gy = 621; jy += 979;
  } else {
    gy = 1600; jy -= 979;
  }
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gd = days + 1;
  const sal_a = ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 4 === 0)) ? 1 : 0;
  gd += sal_a && days > 59 ? 1 : 0;
  const gm = (gd > g_d_m[2] + sal_a && gd > g_d_m[3] + sal_a) ? (Math.floor((gd - sal_a) / 31) + 1) : (Math.floor(gd / 31) + 1);
  gd = (g_d_m[gm - 1] + sal_a) ? (gd - g_d_m[gm - 1] - sal_a) : (gd - g_d_m[gm - 1]);
  return [gy, gm, gd];
}

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const WEEKDAYS_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

export async function getCalendar(action: string = 'today', date?: string): Promise<any> {
  if (action === 'today') {
    const now = new Date();
    const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return {
      gregorian: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      jalali: `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`,
      jalaliText: `${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}`,
      weekday: WEEKDAYS_FA[now.getDay()],
      time: now.toTimeString().substring(0, 8),
    };
  }

  if (action === 'convert' && date) {
    // Expect YYYY-MM-DD (Gregorian to Jalali)
    const [gy, gm, gd] = date.split('-').map(Number);
    if (gy > 1700) {
      const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
      return { input: date, gregorian: date, jalali: `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`, jalaliText: `${jd} ${PERSIAN_MONTHS[jm - 1]} ${jy}` };
    } else {
      // Jalali to Gregorian
      const [gy2, gm2, gd2] = jalaliToGregorian(gy, gm, gd);
      return { input: date, jalali: date, gregorian: `${gy2}-${String(gm2).padStart(2, '0')}-${String(gd2).padStart(2, '0')}` };
    }
  }

  return { error: 'action باید today یا convert باشد' };
}
