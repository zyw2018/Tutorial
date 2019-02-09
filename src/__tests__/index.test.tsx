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
});
