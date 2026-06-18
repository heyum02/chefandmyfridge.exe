// 소비기한 계산 유틸리티

import expireData from './expireRules.json';

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

export function calculateExpirationDate(name, category, sub_category, baseDate) {
    let storageDays = null;

    const categoryGroup = expireData.DETAIL_GROUPS[category];

    if (categoryGroup !== undefined) {
        if (typeof categoryGroup === 'number') {
            storageDays = categoryGroup;
        }
        else if (typeof categoryGroup === 'object') {
            storageDays = categoryGroup[sub_category] ?? categoryGroup["default"];
        }
    }

    if (storageDays === null || storageDays === undefined) {
        storageDays = expireData.DETAIL_GROUPS["기타"] ?? 7;
    }

    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + storageDays);
    return formatDate(targetDate);
}
