import * as apis from './apis';
import * as ins from './ins';
export type { IGroupedStyleList, IPreFetchAppOptions, IPreFetchLibOptions, IPreFetchOptionsBase } from './types';

export const {
  preFetchLib,
  preFetchApp,
  batchPreFetchLib,
  appStyleSrv,
  appParamSrv,
  appMetaSrv,
  logicSrv,
  emitApp,
  init,
  isSubApp,
  getFakeHelContext,
  getExtraData,
  setExtraData,
  bindExternals,
  bindVueRuntime,
  bindReactRuntime,
  core,
} = apis;
export const { resetGlobalThis } = apis.core;
export const { createInstance, createOriginInstance } = ins;
export const eventBus = apis.core.getUserEventBus();

export default {
  preFetchLib,
  preFetchApp,
  batchPreFetchLib,
  appStyleSrv,
  appParamSrv,
  appMetaSrv,
  logicSrv,
  emitApp,
  eventBus,
  init,
  isSubApp,
  getFakeHelContext,
  getExtraData,
  setExtraData,
  bindExternals,
  bindVueRuntime,
  bindReactRuntime,
  resetGlobalThis,
  core: apis.core,
  createInstance,
  createOriginInstance,
};
