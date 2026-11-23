const dayMs=86_400_000;
const chinaOffsetMs=8*3_600_000;

function dayAt(timestamp) {
  return Math.floor((timestamp+chinaOffsetMs)/dayMs);
}

export function readAftercare(raw,now=Date.now()) {
  const rescuedAt=Number.isFinite(raw?.rescuedAt)&&raw.rescuedAt>0
    ? Math.min(raw.rescuedAt,now)
    : now-dayMs;
  const taughtAt=Number.isFinite(raw?.taughtAt)&&raw.taughtAt>=rescuedAt
    ? Math.min(raw.taughtAt,now)
    : null;
  return {rescuedAt,taughtAt};
}

export function aftercareStage(ferry,now=Date.now()) {
  if(ferry?.status!=='done'||!ferry.aftercare)return 'waiting';
  const today=dayAt(now);
  const {rescuedAt,taughtAt}=ferry.aftercare;
  if(today<=dayAt(rescuedAt))return 'waiting';
  if(taughtAt!==null)return today>dayAt(taughtAt)?'later':'together';
  return today-dayAt(rescuedAt)>=3?'independent':'notice';
}

export const aftercareStories={
  bridge:{
    place:'桥边的木板',
    first:'药送到了，空篮就搁你门口。桥第一次下雨有些滑，我从旧渡棚拆了几块木板铺上去。靠岸的那块会翘，明早我再想想。',
    ask:'桥面这几块是我铺的。靠岸那块总会翘。你过桥时能顺手教我怎么压稳吗？',
    action:'示范把木楔压紧',
    thanks:'荷生把楔子起出来，照着你的做法重新压了一遍。这次踩上去，板没抬头。',
    learned:'我把你教的木楔又做了两只，给桥头的篮车道也铺了板。早上可以只推一趟，不用来回搬了。',
    independent:'靠岸那块板压住了。岑叔教我把底下的泥先掏干净，我回去又把另一头也修了。',
  },
  boat:{
    place:'渡口的系篮扣',
    first:'药送到了，空篮就搁你门口。想起那晚你把我和篮子一起带上岸，我用旧铜片做了一个扣，挂在渡口。下回要发船的人都可以借。',
    ask:'铜扣做出来了，绳头遇水会滑。你那晚怎么系的？要是有空，来教我一回。',
    action:'示范把湿绳扣牢',
    thanks:'你拆开旧绳结，重新穿了一遍。荷生用湿手拉了拉，绳扣没滑开。',
    learned:'今天有人借了新做的第二只扣。我在岸上看他自己系好绳，才发现我也能教人了。',
    independent:'绳扣已经能用了。我问了岑叔怎么穿湿绳，今天第一班船借它装了两篮药。',
  },
  radio:{
    place:'报讯杆的雨檐',
    first:'药送到了，空篮就搁你门口。你那辆小车敲铃时，我在芦苇里听得清清楚楚。我在报讯杆上搭了一截短檐，往后下雨也有人用它。',
    ask:'雨檐是我搭的。一阵江风吹过，角上那枚钉就会松。你有空去看看它怎么才扣得住吗？',
    action:'示范扣紧雨檐的卡扣',
    thanks:'荷生看着你把卡扣转到梁底。他又试了一遍，说下回换檐板就会拆了。',
    learned:'我自己给另一侧也加了卡扣。昨天夜里落雨，还有人从驿站那头摇铃问平安。',
    independent:'雨檐修稳了。木栖教我把卡扣转到梁底。今天下雨时，我从檐下听见了第一声铃。',
  },
};
