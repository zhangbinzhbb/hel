export * as core from 'hel-micro-core';
export { default as emitApp } from './process/emitApp';
export * as appMetaSrv from './services/appMeta';
export * as appParamSrv from './services/appParam';
export * as appStyleSrv from './services/appStyle';
export * as logicSrv from './services/logic';
export { init } from './shared/helMicro';
export { isSubApp } from './shared/signal';
export { bindExternals, bindReactRuntime, bindVueRuntime } from './user-util/bindExternals';
export { getExtraData, setExtraData } from './user-util/extraData';
export { default as getFakeHelContext } from './user-util/getFakeHelContext';
export { batchPreFetchLib, preFetchApp, preFetchLib } from './user-util/preFetch';
