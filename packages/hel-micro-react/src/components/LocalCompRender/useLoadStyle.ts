import { helLoadStatus } from 'hel-micro-core';
import React from 'react';
import defaults from '../../consts/defaults';
import * as baseShareHooks from '../../hooks/share';
import type { ILocalCompProps } from '../../types';
import BuildInSkeleton from '../BuildInSkeleton';
import * as share from '../share';

function judgeFetchStyleStr(props: ILocalCompProps, fetchStyleStatusRef: React.RefObject<any>) {
  const { cssListToStr = defaults.CSS_LIST_TO_STR, cssList = [] } = props;
  if (fetchStyleStatusRef.current === helLoadStatus.LOADED) {
    return false;
  }
  const shouldFetchStyle = cssListToStr && cssList.length > 0;
  return shouldFetchStyle;
}

export default function useLoadStyle(props: ILocalCompProps) {
  const forceUpdate = baseShareHooks.useForceUpdate();
  const [state, setState] = baseShareHooks.useObject({ errMsg: '', styleStr: '' });
  const fetchStyleStatusRef = React.useRef(helLoadStatus.NOT_LOAD);
  const { errMsg, styleStr } = state;

  return {
    getStyle: () => {
      const SkeletonView = props.Skeleton || BuildInSkeleton;
      const passCtx = { fetchStyleStatusRef, setState, SkeletonView, forceUpdate };

      // 拉取模块过程中产生错误
      if (errMsg) {
        return share.getErrResult(props, errMsg);
      }

      // 组件已获取完毕，需要获取样式字符串，则继续执行 fetchLocalCompStyleStr
      const shouldFetchStyleStr = judgeFetchStyleStr(props, fetchStyleStatusRef);
      if (shouldFetchStyleStr) {
        return share.fetchLocalCompStyleStr(props.cssList || [], passCtx);
      }

      const finalStyleStr = `${styleStr}${props.extraShadowStyleStr || ''}`;
      // 设置了需要将css列表转为字符串，则返回空样式列表给上层，因逻辑走这里其实已将传入的样式列表转为了字符串
      const finalStyleUrlList = props.cssListToStr ? [] : props.cssList || [];
      return { styleStr: finalStyleStr, styleUrlList: finalStyleUrlList, moduleReady: true };
    },
    errMsg,
  };
}
