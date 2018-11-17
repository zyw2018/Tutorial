import React, { Component, ReactNode, CSSProperties } from 'react';
import { throttle } from 'throttle-debounce';

const defaultThreshold = {
  unit: 'Percent',
  value: 0.7,
};

function parseThreshold(scrollThreshold: number) {
  if (typeof scrollThreshold === 'number') {
    return {
      unit: 'Percent',
      value: scrollThreshold * 100,
    };
  }

  return defaultThreshold;
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

    this.throttledOnScrollListener = throttle(120, this.onScrollListener).bind(
      this
    );
    this.handleBeginScrolling = this.handleBeginScrolling.bind(this);
    this.handleScrolling = this.handleScrolling.bind(this);
    this.handleFinishScrolling = this.handleFinishScrolling.bind(this);
  }

  private actionTriggered = false;
  private el: HTMLElement | undefined | Window & typeof globalThis;
  private lastScrollTop = 0;
  private throttledOnScrollListener: (e: MouseEvent) => void;

  private _ALScroll: HTMLDivElement | undefined;
  private _pullDown: HTMLDivElement | undefined;
  private _scrollableNode: HTMLElement | undefined | null;

  private startY = 0;
  private currentY = 0;
  private dragging = false;

  private maxPullDownDistance = 0;

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
    this.el = this.props.height
      ? this._ALScroll
      : this._scrollableNode || window;

    if (this.el) {
      this.el.addEventListener('scroll', this
        .throttledOnScrollListener as EventListenerOrEventListenerObject);
    }

    if (this.props.pullDownToReload && this.el) {
      this.el.addEventListener('touchstart', this.handleBeginScrolling);
      this.el.addEventListener('touchmove', this.handleScrolling);
      this.el.addEventListener('touchend', this.handleFinishScrolling);

      this.el.addEventListener('mousedown', this.handleBeginScrolling);
      this.el.addEventListener('mousemove', this.handleScrolling);
      this.el.addEventListener('mouseup', this.handleFinishScrolling);

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
      showLoader: false,
    });
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const dataLengthChanged = nextProps.dataLength !== prevState.prevDataLength;

    if (dataLengthChanged) {
      return {
        ...prevState,
        prevDataLength: nextProps.dataLength,
      };
    }
    return null;
  }

  componentWillUnmount() {
    if (this.el) {
      this.el.removeEventListener('scroll', this
        .throttledOnScrollListener as EventListenerOrEventListenerObject);

      if (this.props.pullDownToReload) {
        this.el.removeEventListener('touchstart', this.handleBeginScrolling);
        this.el.removeEventListener('touchmove', this.handleScrolling);
        this.el.removeEventListener('touchend', this.handleFinishScrolling);

        this.el.removeEventListener('mousedown', this.handleBeginScrolling);
        this.el.removeEventListener('mousemove', this.handleScrolling);
        this.el.removeEventListener('mouseup', this.handleFinishScrolling);
      }
    }
  }

  handleBeginScrolling: EventListener = (evt: Event) => {
    if (this.lastScrollTop) return;

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

    if (this.state.pullToReloadThresholdBreached) {
      this.props.reloadFunction && this.props.reloadFunction();
      this.setState({
        pullToReloadThresholdBreached: false,
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

  isElementAtBottom(
    target: HTMLElement,
    scrollThreshold: number = 0.7
  ) {
    const clientHeight =
      target === document.body || target === document.documentElement
        ? window.screen.availHeight
        : target.clientHeight;

    const threshold = parseThreshold(scrollThreshold);

    return (
      target.scrollTop + clientHeight >=
      (threshold.value / 100) * target.scrollHeight
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

    const atBottom = this.isElementAtBottom(target, this.props.scrollThreshold);

    if (atBottom && this.props.hasMore) {
      this.actionTriggered = true;
      this.setState({ showLoader: true });
      this.props.next && this.props.next();
    }

    this.lastScrollTop = target.scrollTop;
  };

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
