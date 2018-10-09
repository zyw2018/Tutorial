import React, { Component, ReactNode, CSSProperties } from 'react';

type Fn = () => any;

export interface Props {
  children: ReactNode;
  dataLength: number;
  hasMore: boolean;
  height?: number | string;
  loader: ReactNode;
  next: Fn;
  onScroll?: (e: MouseEvent) => any;
  pullDownToReload?: boolean;
  releaseToReloadContent?: ReactNode;
  reloadFunction?: Fn;
  scrollableTarget?: ReactNode;
  scrollThreshold?: number;
}

interface State {
  prevDataLength: number | undefined;
  pullToReloadThresholdBreached: boolean;
  showLoader: boolean;
}

export default class AutoLoadingScroll extends Component<Props, State> {
  constructor(props: Props) { 
    super(props);

    this.state = {
      prevDataLength: props.dataLength,
      pullToReloadThresholdBreached: false,
      showLoader: false,
    };

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onEnd = this.onEnd.bind(this);
  }

  private actionTriggered = false;
  private el: HTMLElement | undefined | Window & typeof globalThis;
  private lastScrollTop = 0;

  private _ALScroll: HTMLDivElement | undefined;
  private _pullDown: HTMLDivElement | undefined;

  onStart: EventListener = (evt: Event) => {}
  onMove: EventListener = (evt: Event) => {}
  onEnd: EventListener = () => {}

  render() {
    const style = {
      height: this.props.height || 'auto',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      } as CSSProperties;
    return (
      <div
        className="auto-loading-scroll-component__outerdiv"
      >
        <div
          className={'auto-loading-scroll-component'}
          ref={(ALScroll: HTMLDivElement) => (this._ALScroll = ALScroll)}
          style={style}
        >
          {this.props.pullDownToReload && (
            <div
              style={{ position: 'relative' }}
              ref={(pullDown: HTMLDivElement) => (this._pullDown = pullDown)}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                }}
              >
                {this.state.pullToReloadThresholdBreached
                  && this.props.releaseToReloadContent}
              </div>
            </div>
          )}
          {this.props.children}
        </div>
      </div>
    );
  }
}
