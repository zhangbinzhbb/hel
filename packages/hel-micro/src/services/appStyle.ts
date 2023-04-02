/**
 * 样式相关的服务
 */
import type { HelLoadStatusEnum } from 'hel-micro-core';
import * as core from 'hel-micro-core';
import type { IEmitStyleInfo } from 'hel-types';
import defaults from '../consts/defaults';
import { isEmitVerMatchInputVer } from '../shared/util';
import type { IGetOptionsLoose, IInnerPreFetchOptions, IWaitStyleReadyOptions } from '../types';
import { requestGet } from '../util';
import { getPlatAndVer } from './appParam';

const { KEY_CSS_STR } = defaults;
const { LOADED, LOADING, NOT_LOAD } = core.helLoadStatus;
const eventBus = core.getHelEventBus();
const { STYLE_STR_FETCHED } = core.helEvents;

export interface IFetchStyleOptions extends IGetOptionsLoose {
  /** 支持透传额外的样式地址列表 */
  extraCssList?: string[];
  /** 透传 应用自己的样式列表 + extraCssUrlList 额外样式列表给用户，用户可依此再次排除掉一部分样式，返回的是欲排除的样式列表 */
  getExcludeCssList?: IInnerPreFetchOptions['getExcludeCssList'];
  strictMatchVer?: boolean;
}

const inner = {
  isStyleStatusMatch(appName: string, judeStatus: HelLoadStatusEnum, options: IGetOptionsLoose) {
    const { platform, versionId } = getPlatAndVer(appName, options);
    const status = core.getVerStyleStrStatus(appName, { platform, versionId });
    return status === judeStatus;
  },

  getStyleUrlList(appName: string, options: IGetOptionsLoose): string[] {
    const platAndVer = getPlatAndVer(appName, options);
    const appVersion = core.getVersion(appName, platAndVer);
    // 获取用户 preFetch 设定的额外样式列表
    const extraCssList = core.getVerExtraCssList(appName, platAndVer);
    // 获取构建阶段生成的样式列表
    let buildCssList: string[] = [];
    if (appVersion) {
      buildCssList = appVersion.src_map?.chunkCssSrcList || [];
    }

    const allCssList = core.commonUtil.merge2List(extraCssList, buildCssList);
    return allCssList;
  },

  async fetchStyleStr(cssList: string[]) {
    let str = '';
    // 暂不考虑异常情况，一个 url 拉取失败则中断渲染
    for (let i = 0, len = cssList.length; i < len; i++) {
      const cssUrl = cssList[i];
      let cachedCssStr = core.getCommonData(KEY_CSS_STR, cssUrl);
      if (!cachedCssStr) {
        // 此处在 for 循环里 try catch，是为了保证 css 获取失败时，不影响组件加载
        // 例如 net::ERR_NAME_NOT_RESOLVED
        try {
          const result = await requestGet(cssUrl, false);
          cachedCssStr = result.reply;
          core.setCommonData(KEY_CSS_STR, cssUrl, cachedCssStr);
        } catch (err: any) {
          console.error(err);
        }
      }
      str += cachedCssStr;
    }
    return str;
  },

  async waitStyleReady(appName: string, options: IWaitStyleReadyOptions) {
    let handleStyleFetched: any = null;

    await new Promise((resolve) => {
      handleStyleFetched = (styleInfo: IEmitStyleInfo) => {
        const { appName: emitAppName, platform: emitPlatform, versionId: emitVer } = styleInfo;
        const { versionId: inputVer, platform, strictMatchVer } = options;
        if (
          emitAppName !== appName
          || emitPlatform !== platform
          || !isEmitVerMatchInputVer(appName, { platform, emitVer, inputVer, strictMatchVer })
        ) {
          return;
        }
        resolve(true);
      };

      // 先监听，再触发资源加载，确保监听不会有遗漏
      eventBus.on(STYLE_STR_FETCHED, handleStyleFetched);
    });

    if (handleStyleFetched) {
      eventBus.off(STYLE_STR_FETCHED, handleStyleFetched);
    }
  },

  async fetchAndCacheAppStyleStr(appName: string, options: IFetchStyleOptions) {
    const platAndVer = getPlatAndVer(appName, options);
    const { extraCssList = [], getExcludeCssList } = options;
    // 为应用预设的样式列表
    const presetCssList = inner.getStyleUrlList(appName, options);
    const status = core.getVerStyleStrStatus(appName, platAndVer);
    let presetStyleStr = '';

    // 有其他上层调用已经触发样式获取逻辑，这里调用 waitStyleReady 等待样式获取动作完成即可
    if (status === LOADING) {
      await inner.waitStyleReady(appName, { ...platAndVer, strictMatchVer: options.strictMatchVer });
      presetStyleStr = core.getAppStyleStr(appName, platAndVer) || '';
    } else if (status === NOT_LOAD) {
      core.setVerStyleStrStatus(appName, LOADING, platAndVer);
      presetStyleStr = await inner.fetchStyleStr(presetCssList);
      core.setAppStyleStr(appName, presetStyleStr, platAndVer);
      core.setVerStyleStrStatus(appName, LOADED, platAndVer);
      eventBus.emit(STYLE_STR_FETCHED, { appName, ...platAndVer }); // 预设的样式列表转换为字符串完毕
    } else {
      presetStyleStr = core.getAppStyleStr(appName, platAndVer) || '';
    }

    const allCssList = core.commonUtil.merge2List(presetCssList, extraCssList);
    const excludeCssList = getExcludeCssList?.(allCssList, { version: core.getVersion(appName, platAndVer) }) || [];
    if (!excludeCssList.length && !extraCssList.length) {
      return presetStyleStr;
    }

    // 过滤 allCssList ，去掉未排除的样式得到最终需要转化为字符串的样式列表
    const finalStyleList = allCssList.filter((item) => !excludeCssList.includes(item));
    const styleStr = await inner.fetchStyleStr(finalStyleList);
    return styleStr;
  },
};

/**
 * 异步拉取应用的所有样式字符串（构建动态产生，页面静态引用的）
 * 调用者需自己确保版本数据已获取，即 preFetchApp 或 preFetchLib 已调用
 */
export async function fetchStyleStr(appName: string, options?: IFetchStyleOptions): Promise<string> {
  const styleStr = await inner.fetchAndCacheAppStyleStr(appName, options || {});
  return styleStr;
}

export async function fetchStyleByUrlList(cssUrlList: string[]) {
  const styleStr = await inner.fetchStyleStr(cssUrlList);
  return styleStr;
}

/**
 * 获取应用预设的样式字符串（构建动态产生，页面静态引用的、preFetch 时追加的 extraCssList）
 * 调用者需自己确保样式字符串已拉取，即 fetchStyleStr 已调用
 */
export function getStyleStr(appName: string, options?: IGetOptionsLoose) {
  const platAndVer = getPlatAndVer(appName, options);
  const styleStr = core.getAppStyleStr(appName, platAndVer);
  return styleStr;
}

/**
 * 获取应用预设的样式列表（构建动态产生，页面静态引用的、preFetch 时追加的 extraCssList ）
 * 调用者需自己确保版本数据已获取，即 preFetchApp 或 preFetchLib 已调用
 * @returns {string[]}
 */
export function getStyleUrlList(appName: string, options?: IGetOptionsLoose): string[] {
  const getStyleUrlList = inner.getStyleUrlList(appName, options || {});
  return getStyleUrlList;
}

/**
 * 判断样式是否已经异步拉取过了
 */
export function isStyleFetched(appName: string, options?: IGetOptionsLoose) {
  return inner.isStyleStatusMatch(appName, LOADED, options || {});
}
