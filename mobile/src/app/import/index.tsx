import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Path } from 'react-native-svg'

export default function ImportCaptureScreen(): React.JSX.Element {
  const router = useRouter()

  return (
    <View className="flex-1 bg-background px-6 pt-14">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar para planos"
        onPress={() => router.back()}
        className="mb-4 h-[44px] flex-row items-center"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 19l-7-7 7-7"
            stroke="#8A8A8A"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </Svg>
        <Text className="ml-1 font-ui text-[11px] uppercase tracking-[2px] text-muted">
          PLANOS
        </Text>
      </Pressable>

      <View className="flex-1 justify-center pb-24">
        <Text className="font-display text-[36px] tracking-[1px] text-text">
          IMPORTAÇÃO INDISPONÍVEL
        </Text>
        <Text className="mt-3 font-ui text-[15px] leading-[22px] text-muted">
          A importação por IA agora está disponível apenas no admin web.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="mt-8 h-[56px] items-center justify-center rounded-pill bg-accent"
        >
          <Text className="font-ui text-[14px] uppercase tracking-[2px] text-background">
            VOLTAR
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
