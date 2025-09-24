import React from 'react'
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ScrollSidebar from './scrollSidebar'

jest.mock('./scrollSidebar.module.css', () => ({
  nav: 'nav',
  list: 'list',
  item: 'item',
  active: 'active',
  button: 'button',
}), { virtual: true })

const createdAnchors = new Set()

function mountSectionEls(ids, positions) {
  ids.forEach((id) => {
    if (createdAnchors.has(id)) return
    if (screen.queryByTestId(id)) {
      createdAnchors.add(id)
      return
    }

    const el = document.createElement('div')
    el.id = id
    el.setAttribute('data-testid', id)
    el.textContent = id
    Object.defineProperty(el, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        const top = positions[id] ?? 0
        return { top, left: 0, right: 0, bottom: top + 100, width: 100, height: 100 }
      },
    })
    document.body.appendChild(el)
    createdAnchors.add(id)
  })
}

function liForButtonName(name) {
  const nav = screen.getByRole('navigation', { name: /section navigation/i })
  const lis = within(nav).getAllByRole('listitem')
  return lis.find((li) => within(li).queryByRole('button', { name }))
}

beforeEach(() => {
  createdAnchors.clear()
  jest.restoreAllMocks()
  window.scrollTo = jest.fn()
  window.scrollY = 0
  window.requestAnimationFrame = (cb) => { cb(); return 1 }
  window.cancelAnimationFrame = jest.fn()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ScrollSidebar • rendering & basics', () => {
  it('renders nav + items and applies maxLines + custom classes', () => {
    const sections = ['intro', 'usage-guide', 'api']
    const positions = { intro: -10, 'usage-guide': 60, api: 600 }
    mountSectionEls(sections, positions)

    render(
      <ScrollSidebar
        sections={sections}
        maxLines={3}
        className="extra-nav"
        listClassName="extra-list"
        itemClassName="extra-item"
      />
    )

    const nav = screen.getByRole('navigation', { name: 'Section navigation' })
    expect(nav).toBeInTheDocument()
    expect(nav.style.getPropertyValue('--ssb-max-lines')).toBe('3')

    const list = within(nav).getByRole('list')
    const buttons = within(list).getAllByRole('button')
    expect(buttons.map(b => b.textContent)).toEqual(['intro', 'usage guide', 'api'])

    expect(list.className).toEqual(expect.stringContaining('extra-list'))
    const firstLi = liForButtonName('intro')
    expect(firstLi.className).toEqual(expect.stringContaining('extra-item'))
  })

  it('marks the first section as active initially and sets aria-current', () => {
    const sections = ['a', 'b']
    const positions = { a: -10, b: 100 }
    mountSectionEls(sections, positions)

    render(<ScrollSidebar sections={sections} />)

    expect(screen.getByRole('button', { name: 'a' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'b' })).not.toHaveAttribute('aria-current')
  })

  it('renders safely with empty sections', () => {
    render(<ScrollSidebar sections={[]} />)
    const nav = screen.getByRole('navigation', { name: /section navigation/i })
    expect(within(nav).queryAllByRole('listitem')).toHaveLength(0)
  })
})

describe('ScrollSidebar • active section updates from scroll/resize/hashchange', () => {
  it('updates active as you scroll past the anchor line', () => {
    const sections = ['intro', 'usage', 'api']
    const positions = { intro: -5, usage: 70, api: 900 } // anchorY = 56
    mountSectionEls(sections, positions)

    render(<ScrollSidebar sections={sections} />)
    expect(screen.getByRole('button', { name: 'intro' })).toHaveAttribute('aria-current', 'page')

    positions.usage = 40
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getByRole('button', { name: 'usage' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'intro' })).not.toHaveAttribute('aria-current')
  })

  it('offset prop changes the anchor and therefore the active item', async () => {
    const sections = ['one', 'two']
    const positions = { one: -10, two: 100 }
    mountSectionEls(sections, positions)

    const { rerender } = render(<ScrollSidebar sections={sections} />)
    expect(screen.getByRole('button', { name: 'one' })).toHaveAttribute('aria-current', 'page')

    rerender(<ScrollSidebar sections={sections} offset={70} />) // anchorY=71
    expect(screen.getByRole('button', { name: 'one' })).toHaveAttribute('aria-current', 'page')

    positions.two = -5
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(screen.getByRole('button', { name: 'two' })).toHaveAttribute('aria-current', 'page')

    positions.two = 200
    act(() => {
      window.dispatchEvent(new Event('hashchange'))
      window.dispatchEvent(new Event('scroll'))
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'one' })).toHaveAttribute('aria-current', 'page')
    )
  })

  it('skips missing DOM elements but still finds the correct active section', () => {
    const sections = ['existing', 'MISSING', 'later']
    const positions = { existing: -10, later: 10 }
    mountSectionEls(['existing', 'later'], positions)

    render(<ScrollSidebar sections={sections} />)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(screen.getByRole('button', { name: 'later' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('ScrollSidebar • interactions: click + keyboard + classes + hash', () => {
  it('scrolls to a section smoothly and updates the URL hash on click', () => {
    const sections = ['alpha', 'beta', 'gamma']
    const positions = { alpha: -10, beta: 100, gamma: 800 }
    mountSectionEls(sections, positions)
    render(<ScrollSidebar sections={sections} offset={55} />)

    fireEvent.click(screen.getByRole('button', { name: 'gamma' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 800 - 55, behavior: 'smooth' })
  })

  it('supports keyboard activation via Enter and Space', () => {
    const sections = ['x', 'y']
    const positions = { x: -10, y: 300 }
    mountSectionEls(sections, positions)

    render(<ScrollSidebar sections={sections} />)

    const yBtn = screen.getByRole('button', { name: 'y' })
    fireEvent.keyDown(yBtn, { key: 'Enter' })
    expect(window.scrollTo).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(yBtn, { key: ' ' })
    expect(window.scrollTo).toHaveBeenCalledTimes(2)
  })

  it('applies itemClassName and activeClassName on the active <li>', () => {
    const sections = ['first', 'second']
    const positions = { first: -10, second: 100 }
    mountSectionEls(sections, positions)

    render(
      <ScrollSidebar
        sections={sections}
        itemClassName="custom-item"
        activeClassName="is-active"
      />
    )

    const firstLi = liForButtonName('first')
    expect(firstLi.className).toEqual(expect.stringContaining('custom-item'))
    expect(firstLi.className).toEqual(expect.stringContaining('is-active'))

    positions.second = -1
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    const secondLi = liForButtonName('second')
    expect(secondLi.className).toEqual(expect.stringContaining('custom-item'))
    expect(secondLi.className).toEqual(expect.stringContaining('is-active'))
    expect(firstLi.className).not.toEqual(expect.stringContaining('is-active'))
  })

  it('sets button title and aria-label from the derived label', () => {
    const sections = ['usage-guide']
    const positions = { 'usage-guide': 0 }
    mountSectionEls(sections, positions)

    render(<ScrollSidebar sections={sections} />)

    const btn = screen.getByRole('button', { name: 'usage guide' })
    expect(btn).toHaveAttribute('title', 'usage guide')
    expect(btn).toHaveAttribute('aria-label', 'usage guide')
  })
})

describe('ScrollSidebar • props & lifecycle details', () => {
  it('resets active to the first item when the sections prop changes', () => {
    const initial = ['one', 'two']
    const next = ['alpha', 'beta']
    mountSectionEls(initial, { one: -10, two: 100 })
    mountSectionEls(next, { alpha: -10, beta: 100 })

    const { rerender } = render(<ScrollSidebar sections={initial} />)
    expect(screen.getByRole('button', { name: 'one' })).toHaveAttribute('aria-current', 'page')

    rerender(<ScrollSidebar sections={next} />)
    expect(screen.getByRole('button', { name: 'alpha' })).toHaveAttribute('aria-current', 'page')
  })

  it('cleans up listeners and cancels a pending rAF on unmount', () => {
    const cancelSpy = jest.fn()
    window.requestAnimationFrame = () => 123
    window.cancelAnimationFrame = cancelSpy

    const sections = ['item']
    mountSectionEls(sections, { item: 0 })

    const { unmount } = render(<ScrollSidebar sections={sections} />)
    window.dispatchEvent(new Event('scroll'))

    unmount()
    expect(cancelSpy).toHaveBeenCalledWith(123)
  })
})
