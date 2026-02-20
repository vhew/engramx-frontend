import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LoadingSpinner from './LoadingSpinner.vue';

describe('LoadingSpinner', () => {
  it('renders the spinner element', () => {
    const wrapper = mount(LoadingSpinner);
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
  });

  it('shows label when provided', () => {
    const wrapper = mount(LoadingSpinner, { props: { label: 'Loading data...' } });
    expect(wrapper.text()).toContain('Loading data...');
  });

  it('hides label when not provided', () => {
    const wrapper = mount(LoadingSpinner);
    expect(wrapper.find('span').exists()).toBe(false);
  });

  it('applies small size class', () => {
    const wrapper = mount(LoadingSpinner, { props: { size: 'sm' } });
    expect(wrapper.find('.w-4').exists()).toBe(true);
  });

  it('applies large size class', () => {
    const wrapper = mount(LoadingSpinner, { props: { size: 'lg' } });
    expect(wrapper.find('.w-12').exists()).toBe(true);
  });
});
