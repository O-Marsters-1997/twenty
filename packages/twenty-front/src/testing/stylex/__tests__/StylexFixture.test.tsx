import { render, screen } from '@testing-library/react';

import { StylexFixture } from '~/testing/stylex/StylexFixture';

describe('StylexFixture', () => {
  it('renders with a compiled StyleX class name', () => {
    render(<StylexFixture />);

    expect(screen.getByText('StyleX').className).not.toBe('');
  });
});
