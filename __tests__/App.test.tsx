import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<App />);
    expect(getByText('Live translation')).toBeTruthy();
  });
});
