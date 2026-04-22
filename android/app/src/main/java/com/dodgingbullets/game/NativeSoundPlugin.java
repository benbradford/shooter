package com.dodgingbullets.game;

import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.SoundPool;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "NativeSound")
public class NativeSoundPlugin extends Plugin {
    private static final int MAX_STREAMS = 10;
    private SoundPool soundPool;
    private final Map<String, Integer> soundIds = new HashMap<>();

    @Override
    public void load() {
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        soundPool = new SoundPool.Builder()
            .setMaxStreams(MAX_STREAMS)
            .setAudioAttributes(attrs)
            .build();
    }

    @PluginMethod
    public void preload(PluginCall call) {
        JSArray sounds = call.getArray("sounds");
        if (sounds == null) {
            call.reject("No sounds array provided");
            return;
        }
        try {
            for (int i = 0; i < sounds.length(); i++) {
                JSObject sound = JSObject.fromJSONObject(sounds.getJSONObject(i));
                String key = sound.getString("key");
                String path = sound.getString("path");
                AssetFileDescriptor afd = getContext().getAssets().openFd(path);
                int id = soundPool.load(afd, 1);
                soundIds.put(key, id);
                afd.close();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to preload sounds: " + e.getMessage());
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        String key = call.getString("key");
        float volume = call.getFloat("volume", 1.0f);
        Integer id = soundIds.get(key);
        if (id == null) {
            call.reject("Sound not loaded: " + key);
            return;
        }
        soundPool.play(id, volume, volume, 1, 0, 1.0f);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
    }
}
