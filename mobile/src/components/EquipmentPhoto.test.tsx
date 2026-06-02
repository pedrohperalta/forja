/**
 * EquipmentPhoto component tests
 *
 * Tests empty placeholder, filled thumbnail, tap interactions,
 * full-screen overlay, and accessibility labels.
 */

import { Alert } from 'react-native'
import { render, screen, fireEvent } from '@testing-library/react-native'

import { EquipmentPhoto } from '@/components/EquipmentPhoto'
import { useEquipmentPhoto } from '@/hooks/useEquipmentPhoto'
import type { ExerciseId } from '@/types'

type AlertButton = { text: string; onPress?: () => void; style?: string }

jest.mock('@/storage/mmkv', () => require('@/storage/__mocks__/mmkv'))
jest.mock('@/hooks/useEquipmentPhoto', () => ({
  useEquipmentPhoto: jest.fn(),
  restoreEquipmentPhotosFromCloud: jest.fn(),
}))

jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  const Svg = (props: Record<string, unknown>) => React.createElement('View', props)
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: (props: Record<string, unknown>) => React.createElement('View', props),
  }
})

const EXERCISE_ID = 'supino-reto-vertical' as ExerciseId

const mockPickPhoto = jest.fn()
const mockRemovePhoto = jest.fn()

function setupMock(photoUri?: string) {
  ;(useEquipmentPhoto as jest.Mock).mockReturnValue({
    photoUri,
    pickPhoto: mockPickPhoto,
    removePhoto: mockRemovePhoto,
  })
}

describe('EquipmentPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('empty state', () => {
    it('renders placeholder when no photo exists', () => {
      setupMock(undefined)
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      expect(screen.getByText('Foto do aparelho')).toBeTruthy()
      expect(screen.getByLabelText('Adicionar foto do aparelho')).toBeTruthy()
    })

    it('prompts for source (camera or gallery) on tap', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      setupMock(undefined)
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      fireEvent.press(screen.getByLabelText('Adicionar foto do aparelho'))

      expect(alertSpy).toHaveBeenCalled()
      const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[] | undefined
      const labels = (buttons ?? []).map((b) => b.text)
      expect(labels).toEqual(expect.arrayContaining(['Câmera', 'Galeria']))

      alertSpy.mockRestore()
    })

    it('calls pickPhoto with camera when Câmera is selected', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      setupMock(undefined)
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      fireEvent.press(screen.getByLabelText('Adicionar foto do aparelho'))
      const buttons = (alertSpy.mock.calls[0]?.[2] ?? []) as AlertButton[]
      buttons.find((b) => b.text === 'Câmera')?.onPress?.()

      expect(mockPickPhoto).toHaveBeenCalledWith('camera')

      alertSpy.mockRestore()
    })

    it('calls pickPhoto with gallery when Galeria is selected', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      setupMock(undefined)
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      fireEvent.press(screen.getByLabelText('Adicionar foto do aparelho'))
      const buttons = (alertSpy.mock.calls[0]?.[2] ?? []) as AlertButton[]
      buttons.find((b) => b.text === 'Galeria')?.onPress?.()

      expect(mockPickPhoto).toHaveBeenCalledWith('gallery')

      alertSpy.mockRestore()
    })
  })

  describe('filled state', () => {
    it('renders photo thumbnail when photo exists', () => {
      setupMock('file:///photos/supino.jpg')
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      expect(screen.getByLabelText('Foto do aparelho. Toque para ver ou trocar')).toBeTruthy()
    })

    it('shows full-screen overlay on tap', () => {
      setupMock('file:///photos/supino.jpg')
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      fireEvent.press(screen.getByLabelText('Foto do aparelho. Toque para ver ou trocar'))

      expect(screen.getByText('Trocar foto')).toBeTruthy()
      expect(screen.getByText('Remover')).toBeTruthy()
    })

    it('prompts for source when replace is tapped in overlay', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      setupMock('file:///photos/supino.jpg')
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      fireEvent.press(screen.getByLabelText('Foto do aparelho. Toque para ver ou trocar'))
      fireEvent.press(screen.getByText('Trocar foto'))

      expect(alertSpy).toHaveBeenCalled()
      const buttons = (alertSpy.mock.calls[0]?.[2] ?? []) as AlertButton[]
      buttons.find((b) => b.text === 'Câmera')?.onPress?.()

      expect(mockPickPhoto).toHaveBeenCalledWith('camera')

      alertSpy.mockRestore()
    })

    it('calls removePhoto from overlay remove button', () => {
      setupMock('file:///photos/supino.jpg')
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      fireEvent.press(screen.getByLabelText('Foto do aparelho. Toque para ver ou trocar'))
      fireEvent.press(screen.getByText('Remover'))

      expect(mockRemovePhoto).toHaveBeenCalledTimes(1)
    })

    it('closes overlay when close button is pressed', () => {
      setupMock('file:///photos/supino.jpg')
      render(<EquipmentPhoto exerciseId={EXERCISE_ID} />)

      fireEvent.press(screen.getByLabelText('Foto do aparelho. Toque para ver ou trocar'))
      expect(screen.getByText('Trocar foto')).toBeTruthy()

      fireEvent.press(screen.getByLabelText('Fechar'))

      expect(screen.queryByText('Trocar foto')).toBeNull()
    })
  })
})
