
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';
const headers = {
  'User-Agent': UA,
};

const appConfig = {
  version: 1,
  name: '猫耳FM',
  message: '',
  description: '',
  tabs: {
    library: {
      name: '探索',
      groups: [
        { name: '推荐', type: 'song', ui: 0, showMore: true, ext: { id: '1' } },
        { name: '音单', type: 'album', ui: 0, showMore: true, ext: { id: '2' } },
        { name: '歌单', type: 'playlist', ui: 1, showMore: true, ext: { id: '3' } },
        { name: '排行榜', type: 'playlist', ui: 1, showMore: true, ext: { id: '4' } },
      ],
    },
    personal: { name: '我的', groups: [{ name: '歌曲', type: 'song' }] },
    search: { name: '搜索', groups: [{ name: '歌曲', type: 'song', ext: { type: 'song' } }] },
  },
};

async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, { headers, ...options });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return null;
  }
}

async function getConfig() {
  return JSON.stringify(appConfig);
}

async function getSongs(ext) {
  const { page, id } = ext;
  if (page > 1) return { list: [] };

  const data = await fetchData('https://www.missevan.com/sound/newhomepagedata');
  if (!data) return { list: [] };

  const songs = data.info?.music?.flatMap((genre) =>
    genre.objects_point.map((each) => ({
      id: `${each.id}`,
      name: each.soundstr,
      cover: each.front_cover,
      duration: Math.floor(each.duration / 100),
      artist: { id: `${each.user_id}`, name: each.username },
      ext: { id: each.id },
    }))
  );

  return { list: songs || [] };
}

async function getPlaylists(ext) {
  const { page, id } = ext;
  if (page > 1) return { list: [] };

  let cards = [];
  if (id === '3') {
    const data = await fetchData('https://www.missevan.com/explore/tagalbum?order=0');
    cards = data?.albums?.map((each) => ({
      id: `${each.id}`,
      name: each.title,
      cover: each.front_cover,
      artist: { id: `${each.user_id}`, name: each.username },
      ext: { id: each.id },
    })) || [];
  }

  if (id === '4') {
    const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?_=${Date.now()}&data=${encodeURIComponent(
      JSON.stringify({
        comm: { ct: 24, cv: 0 },
        topList: { module: 'musicToplist.ToplistInfoServer', method: 'GetAll', param: {} },
      })
    )}`;
    const data = await fetchData(url);
    cards = data?.topList?.data?.group?.flatMap((group) =>
      group.toplist.map((e) => ({
        id: `${e.topId}`,
        name: e.title,
        cover: e.headPicUrl || e.frontPicUrl,
        artist: { id: 'qq', name: '' },
        ext: { id: `${e.topId}`, type: 'toplist', period: e.period },
      }))
    ) || [];
  }

  return { list: cards };
}

async function search(ext) {
  const { text, page, type } = ext;
  if (page > 1) return { list: [] };

  if (type === 'song') {
    const url = `http://c.y.qq.com/soso/fcgi-bin/client_search_cp?new_json=1&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p=1&n=20&w=${encodeURIComponent(
      text
    )}&needNewCode=0`;
    const data = await fetchData(url);
    const songs = data?.data?.song?.list?.map((each) => ({
      id: `${each.mid}`,
      name: each.name,
      cover: `https://y.gtimg.cn/music/photo_new/T002R800x800M000${each.album.mid}.jpg`,
      artist: { id: `${each.singer[0]?.id}`, name: each.singer[0]?.name || '' },
      ext: { qid: each.mid },
    })) || [];
    return { list: songs };
  }

  return { list: [] };
}

async function getSongInfo(ext) {
  const { url, id, qid } = ext;
  if (url) return { urls: [url] };

  if (id) {
    const data = await fetchData(`https://www.missevan.com/sound/getsound?soundid=${id}`);
    const soundUrl = data?.info?.sound?.soundurl;
    if (soundUrl) return { urls: [soundUrl], headers: [{ 'User-Agent': UA }] };
  }

  if (qid) {
    const data = await fetchData(`https://lxmusicapi.onrender.com/url/tx/${qid}/320k`, {
      headers: { 'X-Request-Key': 'share-v2' },
    });
    const soundUrl = data?.url;
    if (soundUrl) return { urls: [soundUrl] };
  }

  return { urls: [] };
}
