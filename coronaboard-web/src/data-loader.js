const axios = require('axios'); ////////// 여기!!! p.208
const { subDays } = require('date-fns');
const { format, utcToZonedTime } = require('date-fns-tz');
const _ = require('lodash');

const countryInfo = require('../../tools/downloaded/countryInfo.json');
const ApiClient = require('./api-client');

async function getDataSource() {
    const countryByCc = _.keyBy(countryInfo, 'cc');
    const apiClient = new ApiClient();

    // 7장에서 수집해서 저장해둔 전세계 통계를 로드
    const allGlobalStats = await apiClient.getAllGlobalStats(); //  국가별 데이터 로드
    const groupedByDate = _.groupBy(allGlobalStats, 'date'); // 날짜별로 데이터를 묶는 부분을 기존 generateGlobalStats() 함수에서 추출

    const globalStats = generateGlobalStats(groupedByDate);
    //const globalStats = await generateGlobalStats();

    return {
        lastUpdated: Date.now(), // 데이터를 만든 현재 시간 기록
        globalStats,
        countryByCc,
    };
}

function generateGlobalStats(groupedByDate) {   

    // const now = new Date();
    const now = new Date('2021-06-05');
    const timeZone = 'Asia/Seoul';
    const today = format(utcToZonedTime(now, timeZone), 'yyyy-MM-dd');
    const yesterday = format(
        utcToZonedTime(subDays(now, 1), timeZone),
        'yyyy-MM-dd',
    );

    if (!groupedByDate[today]) {
        throw new Error('Data for today is missing');
    }

    return createGlobalStatWithPrevField(
        groupedByDate[today],
        groupedByDate[yesterday],
    );
}

function createGlobalStatWithPrevField(todayStats, yesterdayStats) {
    const yesterdayStatsByCc = _.keyBy(yesterdayStats, 'cc');

    const globalStatWithPrev = todayStats.map((todayStat) => {
        const cc = todayStat.cc;
        const yesterdayStat = yesterdayStatsByCc[cc];
        if (yesterdayStat) {
            return {
                ...todayStat,
                confirmedPrev: yesterdayStat.confirmed || 0,
                deathPrev: yesterdayStat.death || 0,
                negativePrev: yesterdayStat.negative || 0,
                releasedPrev: yesterdayStat.released || 0,
                testedPrev: yesterdayStat.tested || 0,
            };
        }

        return todayStat;
    });

    return globalStatWithPrev;
}

module.exports = {
    getDataSource,
};