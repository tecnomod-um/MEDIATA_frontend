import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import FilePicker from './filePicker'
import UploadFilePicker from './uploadFilePicker'
import FilePickerStyles from './filePicker.module.css'
import { vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('FilePicker', () => {
  const files = [
    { nodeId: 'n1', nodeName: 'Node 1', files: ['f1.txt', 'f2.txt'] },
    { nodeId: 'n2', nodeName: 'Node 2', files: ['g1.txt'] },
  ]

  it('renders title and confirm disabled when no files', () => {
    render(
      <FilePicker
        files={[]}
        onFilesSelected={vi.fn()}
        isProcessing={false}
      />
    )
    expect(
      screen.getByText('Select Files to Process')
    ).toBeInTheDocument()

    const confirm = screen.getByRole('button', {
      name: /Process selected files/i,
    })
    expect(confirm).toBeDisabled()

    act(() => vi.advanceTimersByTime(50))
    expect(screen.queryByText('No files available')).not.toBeInTheDocument()
  })

  it('pre-selects files given via preSelectedFiles', () => {
    render(
      <FilePicker
        files={files}
        preSelectedFiles={{ n1: ['f2.txt'] }}
        onFilesSelected={vi.fn()}
      />
    )
    act(() => vi.advanceTimersByTime(50))
  
    const f2 = screen.getByText('f2.txt')
    expect(f2).toHaveClass(FilePickerStyles.selected)
    expect(
      screen.getByRole('button', { name: /Process selected files/i })
    ).toBeEnabled()
  })
  
  it('blocks selection when isProcessing=true', () => {
    render(
      <FilePicker
        files={files}
        onFilesSelected={vi.fn()}
        isProcessing={true}
      />
    )
    act(() => vi.advanceTimersByTime(50))
  
    const f1 = screen.getByText('f1.txt')
    expect(f1).toHaveClass(FilePickerStyles.disabledFile)
    fireEvent.click(f1)
    expect(f1).not.toHaveClass(FilePickerStyles.selected)
    expect(screen.getByRole('button', { name: /Processing…|Processing.../ })).toBeDisabled()
  })
  
  it('allows selecting and confirms via callback', () => {
    const onFilesSelected = vi.fn()
    render(
      <FilePicker
        files={files}
        onFilesSelected={onFilesSelected}
        isProcessing={false}
      />
    )
    act(() => vi.advanceTimersByTime(50))
  
    const confirm = screen.getByRole('button', {
      name: /Process selected files/i,
    })
    expect(confirm).toBeDisabled()
  
    fireEvent.click(screen.getByText('f1.txt'))
    expect(screen.getByText('f1.txt')).toHaveClass(FilePickerStyles.selected)
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    expect(onFilesSelected).toHaveBeenCalledWith({ n1: ['f1.txt'] })
  })

  it('autoProcess triggers callback after delay', () => {
    const onFilesSelected = vi.fn()
    render(
      <FilePicker
        files={files}
        onFilesSelected={onFilesSelected}
        autoProcess={true}
        isProcessing={false}
      />
    )
    act(() => vi.advanceTimersByTime(50))

    fireEvent.click(screen.getByText('g1.txt'))
    act(() => vi.advanceTimersByTime(500))
    expect(onFilesSelected).toHaveBeenCalledWith({ n2: ['g1.txt'] })
  })

  it('uses custom modalTitle', () => {
    render(
      <FilePicker
        files={files}
        onFilesSelected={() => { }}
        modalTitle="Upload your files"
      />
    )
    expect(screen.getByText('Upload your files')).toBeInTheDocument()
  })
})

describe('UploadFilePicker', () => {
  const fileObj = new File(['hello'], 'hello.txt', { type: 'text/plain' })

  it('renders upload prompt and confirm disabled', () => {
    render(
      <UploadFilePicker onFileUpload={vi.fn()} isProcessing={false} />
    )
    expect(
      screen.getByText('Click to select file...')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Upload File/ })
    ).toBeDisabled()
  })

  it('allows file selection and invokes callback', async () => {
    const onFileUpload = vi.fn()
    render(
      <UploadFilePicker onFileUpload={onFileUpload} isProcessing={false} />
    )

    fireEvent.click(screen.getByText('Click to select file...'))

    const input = screen.getByLabelText(/select file/i)
    fireEvent.change(input, { target: { files: [fileObj] } })

    expect(screen.getByText('hello.txt')).toBeInTheDocument()

    const btn = screen.getByRole('button', { name: /Upload File/ })
    expect(btn).toBeEnabled()

    fireEvent.click(btn)
    expect(onFileUpload).toHaveBeenCalledWith(fileObj)
  })

  it('blocks selection and confirm while processing', () => {
    const onFileUpload = vi.fn()
    render(
      <UploadFilePicker onFileUpload={onFileUpload} isProcessing={true} />
    )

    fireEvent.click(screen.getByText('Click to select file...'))
    const input = screen.getByLabelText(/select file/i)
    expect(input).toBeDisabled()

    expect(
      screen.getByRole('button', { name: /Processing…|Processing.../ })
    ).toBeDisabled()
  })

  it('uses provided modalTitle', () => {
    render(
      <UploadFilePicker
        onFileUpload={() => { }}
        modalTitle="My Uploader"
      />
    )
    expect(screen.getByText('My Uploader')).toBeInTheDocument()
  })
})
