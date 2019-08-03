import React from 'react';
import { render, cleanup } from '@testing-library/react';

import AutoLoadingScroll from '../autoLoadingScroll/index';

describe('React Auto Loading on Scroll Component', () => {
  const originalConsoleError = console.error;

  afterEach(() => {
    cleanup();
    console.error = originalConsoleError;
  });

  it('should render auto loading scroll component', () => {
    const { container } = render(
      <AutoLoadingScroll
        dataLength={4}
        loader={'Loading...'}
        hasMore={false}
        next={() => {}}
      >
        <div />
      </AutoLoadingScroll>
    );
    expect(
      container.querySelectorAll('.auto-loading-scroll-component').length
    ).toBe(1);
  });

  it('should render children if exist', () => {
    const { container } = render(
      <AutoLoadingScroll
        dataLength={3}
        loader={'Loading...'}
        hasMore={false}
        next={() => {}}
      >
        <div className="child" />
      </AutoLoadingScroll>
    );
    expect(container.querySelectorAll('.child').length).toBe(1);
  });

  it('should call scroll handler when user scrolls', () => {
    jest.useFakeTimers();
    const onScrollMock = jest.fn();

    const { container } = render(
      <AutoLoadingScroll
        onScroll={onScrollMock}
        dataLength={3}
        height={60}
        hasMore={false}
        loader={'Loading...'}
        next={() => {}}
      >
        <div />
      </AutoLoadingScroll>
    );

    const scrollEvent = new Event('scroll');
    const node = container.querySelector(
      '.auto-loading-scroll-component'
    ) as HTMLElement;

    node.dispatchEvent(scrollEvent);
    jest.runOnlyPendingTimers();
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(onScrollMock).toHaveBeenCalled();
  });

  describe('When required props are missing', () => {
    it('should throw an error', () => {
      console.error = jest.fn();
      const props = { loader: 'Loading...', hasMore: false, next: () => {} };

      // @ts-ignore
      expect(() => render(<AutoLoadingScroll {...props} />)).toThrow(Error);
      // @ts-ignore
      expect(console.error.mock.calls[0][0]).toContain(
        'Missing "dataLength" prop'
      );
    });
  });

  describe('When scroll reaches the bottom', () => {
    it('should not show loading if hasMore is false', () => {
      const { container, queryByText } = render(
        <AutoLoadingScroll
          dataLength={3}
          hasMore={false}
          scrollBreakPoint={0}
          loader={'Loading...'}
          next={() => {}}
        >
          <div />
        </AutoLoadingScroll>
      );

      const scrollEvent = new Event('scroll');
      const node = container.querySelector(
        '.auto-loading-scroll-component'
      ) as HTMLElement;
      node.dispatchEvent(scrollEvent);
      expect(queryByText('Loading...')).toBeFalsy();
    });

    it('should display loading when hasMore is true', () => {
      const { container, getByText } = render(
        <AutoLoadingScroll
          dataLength={3}
          hasMore={true}
          height={60}
          loader={'Loading...'}
          next={() => {}}
          scrollBreakPoint={0}
        >
          <div />
        </AutoLoadingScroll>
      );

      const scrollEvent = new Event('scroll');
      const node = container.querySelector(
        '.auto-loading-scroll-component'
      ) as HTMLElement;
      node.dispatchEvent(scrollEvent);
      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  it('should add a classname to the wrapper', () => {
    const { container } = render(
      <AutoLoadingScroll
        dataLength={10}
        hasMore={true}
        loader={<div>Loading...</div>}
        next={() => {}}
      >
        <div />
      </AutoLoadingScroll>
    );
    const wrapper = container.getElementsByClassName(
      'auto-loading-scroll-component-wrapper'
    );
    expect(wrapper.length).toBeTruthy();
  });
});
