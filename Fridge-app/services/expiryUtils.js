import { EXCEPTION_ITEMS, FREEZER_ITEMS, DEFAULT_STORAGE_DAYS } from './expireRules';

export const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};

export const calculateDaysLeft = (expiryDateStr) => {
    const target = new Date(expiryDateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

export function calculateExpirationDate(name, category, baseDate) {
    let storageDays = null;

    const matchKey = Object.keys(EXCEPTION_ITEMS).find(key => name.includes(key));

    if (matchKey) {
        storageDays = EXCEPTION_ITEMS[matchKey];
    }
    else if (name.includes("냉동") || FREEZER_ITEMS.some(item => name.includes(item))) {
        storageDays = 180;
    } else {
        storageDays = DEFAULT_STORAGE_DAYS[category] ?? DEFAULT_STORAGE_DAYS["기타"];
    }

    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + storageDays);
    return formatDate(targetDate);
}
