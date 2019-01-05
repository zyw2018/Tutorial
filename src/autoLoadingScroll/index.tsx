import React, { Component, ReactNode, CSSProperties } from 'react';
import { throttle } from 'throttle-debounce';

const defaultBreakPoint = {
  unit: 'Percent',
  value: 0.7,
};

function getBreakPoint(scrollBreakPoint: number) {
  if (typeof scrollBreakPoint === 'number') {
    return {
      unit: 'Percent',
      value: scrollBreakPoint * 100,
    };
  }

  return defaultBreakPoint;
}

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
  scrollBreakPoint?: number;
}

interface State {
  preDataLength: number | undefined;
  pullToReloadBreakPointReached: boolean;
  shouldShowLoading: boolean;
}

export default class AutoLoadingScroll extends Component<Props, State> {

  private actionTriggered = false;
  private elem: HTMLElement | undefined | Window & typeof globalThis;
  private preScrollTop = 0;
  private scrollThrottleListener: (e: MouseEvent) => void;
  private maxPullDownDistance = 0;

  private _ALScroll: HTMLDivElement | undefined;
  private _pullDown: HTMLDivElement | undefined;
  private _scrollableNode: HTMLElement | undefined | null;

  private startY = 0;
  private currentY = 0;
  private dragging = false;

  constructor(props: Props) { 
    super(props);

    this.state = {
      preDataLength: props.dataLength,
      pullToReloadBreakPointReached: false,
      shouldShowLoading: false,
    };

    this.scrollThrottleListener = throttle(120, this.onScrollListener).bind(
      this
    );
    this.handleBeginScrolling = this.handleBeginScrolling.bind(this);
    this.handleScrolling = this.handleScrolling.bind(this);
    this.handleFinishScrolling = this.handleFinishScrolling.bind(this);
  }

  getScrollableTarget = () => {
    if (this.props.scrollableTarget instanceof HTMLElement)
      return this.props.scrollableTarget;
 
    return null;
  };

  componentDidMount() {
    if (typeof this.props.dataLength === 'undefined') {
      throw new Error(
        'Missing "dataLength" prop'
      );
    }

    this._scrollableNode = this.getScrollableTarget();
    this.elem = this.props.height
      ? this._ALScroll
      : this._scrollableNode || window;

    if (this.elem) {
      this.elem.addEventListener('scroll', this
        .scrollThrottleListener as EventListenerOrEventListenerObject);
    }

    if (this.props.pullDownToReload && this.elem) {
      this.elem.addEventListener('touchstart', this.handleBeginScrolling);
      this.elem.addEventListener('touchmove', this.handleScrolling);
      this.elem.addEventListener('touchend', this.handleFinishScrolling);

      this.elem.addEventListener('mousedown', this.handleBeginScrolling);
      this.elem.addEventListener('mousemove', this.handleScrolling);
      this.elem.addEventListener('mouseup', this.handleFinishScrolling);

      this.maxPullDownDistance =
        (this._pullDown &&
          this._pullDown.firstChild &&
          (this._pullDown.firstChild as HTMLDivElement).getBoundingClientRect()
            .height) ||
        0;
      this.forceUpdate();

      if (typeof this.props.reloadFunction !== 'function') {
        throw new Error(
          'Miss function "ReloadFunction" as prop'
        );
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.dataLength === prevProps.dataLength) return;

    this.actionTriggered = false;

    this.setState({
      shouldShowLoading: false,
    });
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const dataLengthChanged = nextProps.dataLength !== prevState.preDataLength;

    if (dataLengthChanged) {
      return {
        ...prevState,
        preDataLength: nextProps.dataLength,
      };
    }
    return null;
  }

  componentWillUnmount() {
    if (this.elem) {
      this.elem.removeEventListener('scroll', this
        .scrollThrottleListener as EventListenerOrEventListenerObject);

      if (this.props.pullDownToReload) {
        this.elem.removeEventListener('touchstart', this.handleBeginScrolling);
        this.elem.removeEventListener('touchmove', this.handleScrolling);
        this.elem.removeEventListener('touchend', this.handleFinishScrolling);

        this.elem.removeEventListener('mousedown', this.handleBeginScrolling);
        this.elem.removeEventListener('mousemove', this.handleScrolling);
        this.elem.removeEventListener('mouseup', this.handleFinishScrolling);
      }
    }
  }

  handleBeginScrolling: EventListener = (evt: Event) => {
    if (this.preScrollTop) return;

    this.dragging = true;

    if (evt instanceof MouseEvent) {
      this.startY = evt.pageY;
    } else if (evt instanceof TouchEvent) {
      this.startY = evt.touches[0].pageY;
    }
    this.currentY = this.startY;

    if (this._ALScroll) {
      this._ALScroll.style.willChange = 'transform';
      this._ALScroll.style.transition = `transform 0.2s cubic-bezier(0,0,0.32,1)`;
    }
  };

  handleScrolling: EventListener = (evt: Event) => {
    if (!this.dragging) return;

    if (evt instanceof MouseEvent) {
      this.currentY = evt.pageY;
    } else if (evt instanceof TouchEvent) {
      this.currentY = evt.touches[0].pageY;
    }

    if (this.currentY < this.startY) return;

    if (this._ALScroll) {
      this._ALScroll.style.overflow = 'visible';
      this._ALScroll.style.transform = `translate3d(0px, ${this.currentY -
        this.startY}px, 0px)`;
    }
  };

  handleFinishScrolling: EventListener = () => {
    this.startY = 0;
    this.currentY = 0;

    this.dragging = false;

    if (this.state.pullToReloadBreakPointReached) {
      this.props.reloadFunction && this.props.reloadFunction();
      this.setState({
        pullToReloadBreakPointReached: false,
      });
    }

    requestAnimationFrame(() => {
      if (this._ALScroll) {
        this._ALScroll.style.overflow = 'auto';
        this._ALScroll.style.transform = 'none';
        this._ALScroll.style.willChange = 'unset';
      }
    });
  };

  isBottomReached(
    target: HTMLElement,
    scrollBreakPoint: number = 0.7
  ) {
    const clientHeight =
      target === document.body || target === document.documentElement
        ? window.screen.availHeight
        : target.clientHeight;

    const breakPoint = getBreakPoint(scrollBreakPoint);

    return (
      target.scrollTop + clientHeight >=
      (breakPoint.value / 100) * target.scrollHeight
    );
  }

  onScrollListener = (event: MouseEvent) => {
    if (typeof this.props.onScroll === 'function') {
       setTimeout(() => this.props.onScroll && this.props.onScroll(event), 0);
    }

    const target =
      this.props.height || this._scrollableNode
        ? (event.target as HTMLElement)
        : document.documentElement.scrollTop
        ? document.documentElement
        : document.body;

    if (this.actionTriggered) return;

    const isAtBottom = this.isBottomReached(target, this.props.scrollBreakPoint);

    if (isAtBottom && this.props.hasMore) {
      this.actionTriggered = true;
      this.setState({ shouldShowLoading: true });
      this.props.next && this.props.next();
    }

    this.preScrollTop = target.scrollTop;
  };

  render() {
    const style = {
      height: this.props.height || 'auto',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      } as CSSProperties;
    const hasChildren =
      !!(
        this.props.children &&
        this.props.children instanceof Array &&
        this.props.children.length
      );

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
                  top: -1 * this.maxPullDownDistance,
                }}
              >
                {this.state.pullToReloadBreakPointReached
                  && this.props.releaseToReloadContent}
              </div>
            </div>
          )}
          {this.props.children}
          {((!this.state.shouldShowLoading &&
            !hasChildren) || (this.state.shouldShowLoading)) && this.props.hasMore && this.props.loader}
        </div>
      </div>
    );
  }
}
