export const checkVisionAnalysisResult = (index, result) => {

    if (!result || !Array.isArray(result) || result.length === 0) {
        return {
            status: 'ERROR',
            message: `이미지 [${index + 1}]의 분석 결과가 올바르지 않거나 텅 비어있습니다.`,
            extractedItems: []
        };
    }

    const processedItems = result.map(item => {
        const isUnknown = item.name && String(item.name).toUpperCase().trim() === 'UNKNOWN';
        return {
            ...item,
            name: isUnknown ? '' : item.name,
            isUnknown: isUnknown
        };
    });

    return {
        status: 'SUCCESS',
        extractedItems: processedItems
    };
};
