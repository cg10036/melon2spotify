import nodeFetch, { Response } from "node-fetch";
import fetchCookie from "fetch-cookie";
import { JSDOM } from "jsdom";
import { Song } from "./interfaces/Song";

const ListSongURL =
  "https://www.melon.com/mymusic/playlist/mymusicplaylistview_listSong.htm";
const ListPagingSongURL =
  "https://www.melon.com/mymusic/playlist/mymusicplaylistview_listPagingSong.htm";

const isValidURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const parseInfo = (html: string) => {
  const { document } = new JSDOM(html).window;
  let length = document
    .querySelector(".cnt")
    ?.textContent?.replace(/[^0-9]+/g, "");

  let list: Song[] = [];
  let trs = document.querySelectorAll("tr");
  for (let i = 1; i < trs.length; i++) {
    let tds = trs.item(i).querySelectorAll("td");
    let name = tds.item(2).querySelector(".fc_gray")?.textContent;
    let artist = tds.item(3).querySelector(".fc_mgray")?.textContent;
    if (name && artist) {
      list.push({ name, artist });
    }
  }

  return {
    length: length ? Number.parseInt(length) : -1,
    list,
  };
};

export const getPlaylist = async (url: string) => {
  const fetch = fetchCookie(nodeFetch, new fetchCookie.toughCookie.CookieJar());
  let resp = await fetch(url);
  let parsedUrl = new URL(resp.url);
  url = parsedUrl.toString();
  let playlistSeq = parsedUrl.searchParams.get("plylstSeq");
  if (!playlistSeq) {
    throw Error("PlaylistSeq not found. Check playlist url");
  }

  resp = await fetch(`${ListSongURL}?plylstSeq=${playlistSeq}`);
  let text = await resp.text();
  let { length, list } = parseInfo(text);

  length = Math.ceil(length / 50);
  for (let i = 1; i < length; i++) {
    resp = await fetch(
      `${ListPagingSongURL}?startIndex=${
        50 * i + 1
      }&pageSize=50&plylstSeq=${playlistSeq}`,
      {
        headers: {
          Referer: url,
        },
      }
    );
    text = await resp.text();
    list.push(...parseInfo(text).list);
  }

  console.log(JSON.stringify(list));
  return list;
};

// getPlaylist("http://kko.to/ssQ9tzZWJ");
